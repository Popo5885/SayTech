import net from "node:net";
import tls from "node:tls";
import { maskEmail } from "@lottery/core";
import { getSmtpConfig, type SmtpConfig } from "./email-settings";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  unsubscribeUrl?: string | null;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType: string;
  }>;
};

function escapeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(escapeHeader(value), "utf8").toString("base64")}?=`;
}

function wrapWithFooter(html: string, unsubscribeUrl?: string | null): string {
  const unsubscribe = unsubscribeUrl
    ? `<p style="margin:20px 0 0"><a href="${unsubscribeUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:14px;padding:10px 18px;font-weight:700">הסרה מרשימת התפוצה</a></p>`
    : "";

  return `
    <div dir="rtl" style="margin:0;background:#f8fafc;padding:28px;font-family:Heebo,Arial,Helvetica,sans-serif;line-height:1.7;color:#111827;text-align:right">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;padding:28px">
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:18px">Magic Flow</div>
        ${html}
        <p style="margin:24px 0 0"><a href="tel:0542466340" style="display:inline-block;background:#06b6d4;color:#07111f;text-decoration:none;border-radius:16px;padding:12px 20px;font-weight:900">חיוג מהיר לשלמה: 054-246-6340</a></p>
        <hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0" />
        <p style="margin:0;font-weight:700">שלמה פופוביץ | <span dir="ltr">054-246-6340</span></p>
        <p style="margin:4px 0;color:#6b7280">כל הזכויות שמורות ל-Magic Flow © 2026. פתרונות אוטומציה חכמים.</p>
        ${unsubscribe}
      </div>
    </div>
  `;
}

function encodeAttachmentContent(content: string | Buffer): string {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return buffer.toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

function buildMimeMessage(input: SendEmailInput, config: SmtpConfig): string {
  const html = wrapWithFooter(input.html, input.unsubscribeUrl);
  const baseHeaders = [
    `From: ${encodeHeader("Magic Flow")} <${config.from}>`,
    `To: <${input.to}>`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0"
  ];

  if (!input.attachments?.length) {
    return [
      ...baseHeaders,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      "."
    ].join("\r\n");
  }

  const boundary = `magic-flow-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const parts = [
    ...baseHeaders,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html
  ];

  for (const attachment of input.attachments) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${escapeHeader(attachment.filename)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${escapeHeader(attachment.filename)}"`,
      "",
      encodeAttachmentContent(attachment.content)
    );
  }

  parts.push(`--${boundary}--`, "", ".");

  return parts.join("\r\n");
}

async function readResponse(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1];

      if (last && /^\d{3}\s/.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function writeCommand(socket: net.Socket | tls.TLSSocket, command: string): Promise<string> {
  socket.write(`${command}\r\n`);
  return readResponse(socket);
}

async function writeExpected(
  socket: net.Socket | tls.TLSSocket,
  command: string,
  expectedCodes: string[]
): Promise<string> {
  const response = await writeCommand(socket, command);
  const code = response.match(/^(\d{3})/m)?.[1];

  if (!code || !expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed with response: ${response.trim().slice(0, 240)}`);
  }

  return response;
}

async function openSocket(config: SmtpConfig): Promise<net.Socket | tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = config.secure
      ? tls.connect({ host: config.host, port: config.port, servername: config.host })
      : net.connect({ host: config.host, port: config.port });

    socket.once(config.secure ? "secureConnect" : "connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function sendViaSmtp(input: SendEmailInput, config: SmtpConfig): Promise<void> {
  const socket = await openSocket(config);
  const greeting = await readResponse(socket);

  if (!/^220/m.test(greeting)) {
    throw new Error(`SMTP greeting failed: ${greeting.trim().slice(0, 240)}`);
  }

  await writeExpected(socket, `EHLO ${process.env.SMTP_HELO_HOST ?? "magic-flow.local"}`, ["250"]);
  await writeExpected(socket, "AUTH LOGIN", ["334"]);
  await writeExpected(socket, Buffer.from(config.user, "utf8").toString("base64"), ["334"]);
  await writeExpected(socket, Buffer.from(config.pass, "utf8").toString("base64"), ["235"]);
  await writeExpected(socket, `MAIL FROM:<${config.from}>`, ["250"]);
  await writeExpected(socket, `RCPT TO:<${input.to}>`, ["250", "251"]);
  await writeExpected(socket, "DATA", ["354"]);

  const message = buildMimeMessage(input, config);

  await writeExpected(socket, message, ["250"]);
  await writeCommand(socket, "QUIT");
  socket.end();
}

export async function sendSystemEmail(input: SendEmailInput): Promise<boolean> {
  const config = await getSmtpConfig();

  if (!config) {
    // SECURITY: mask the recipient address — log streams are often shipped
    // to third-party aggregators (Logtail, Datadog, etc.).
    console.info(`[email:skipped] ${maskEmail(input.to)} - ${input.subject}`);
    return false;
  }

  try {
    await sendViaSmtp(input, config);
    return true;
  } catch (error) {
    console.error("[email:failed]", error);
    return false;
  }
}

export function ownerEmail(): string {
  return process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com";
}
