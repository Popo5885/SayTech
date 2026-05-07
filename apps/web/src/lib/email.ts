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

const SAYTECH_SUPPORT_PHONE = "054-246-6340";
const SAYTECH_WEBSITE = "https://saytech.co.il/";

function wrapWithFooter(html: string, unsubscribeUrl?: string | null): string {
  const unsubscribeBlock = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="display:inline-block;font-size:12px;color:#94a3b8;text-decoration:underline;margin-top:8px">הסרה מרשימת התפוצה</a>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Heebo,Arial,Helvetica,sans-serif;direction:rtl;text-align:right">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:28px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3b2f8f 0%,#6048d4 100%);border-radius:20px 20px 0 0;padding:22px 28px">
            <span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.3px">SayTech</span>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:3px;font-weight:600">פתרונות אוטומציה חכמים</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:28px;border-right:1px solid #e2e8f0;border-left:1px solid #e2e8f0">
            ${html}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#1e293b;border-radius:0 0 20px 20px;padding:20px 28px">
            <p style="margin:0;font-size:13px;font-weight:700;color:#94a3b8">SayTech | שירות לקוחות</p>
            <p style="margin:5px 0 0;font-size:13px;color:#64748b">
              טלפון: <a href="tel:${SAYTECH_SUPPORT_PHONE.replace(/-/g,"")}" style="color:#a78bfa;text-decoration:none;font-weight:700">${SAYTECH_SUPPORT_PHONE}</a>
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b">
              <a href="${SAYTECH_WEBSITE}" style="color:#a78bfa;text-decoration:none">${SAYTECH_WEBSITE}</a>
            </p>
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid #334155">
              <p style="margin:0;font-size:11px;color:#475569">© 2026 SayTech. כל הזכויות שמורות.</p>
              ${unsubscribeBlock}
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function encodeAttachmentContent(content: string | Buffer): string {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return buffer.toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

function buildMimeMessage(input: SendEmailInput, config: SmtpConfig): string {
  const html = wrapWithFooter(input.html, input.unsubscribeUrl);
  const baseHeaders = [
    `From: ${encodeHeader("SayTech")} <${config.from}>`,
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
