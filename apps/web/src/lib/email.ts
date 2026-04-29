import net from "node:net";
import tls from "node:tls";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  unsubscribeUrl?: string | null;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 465),
    user,
    pass,
    from,
    secure: process.env.SMTP_SECURE !== "false"
  };
}

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
    <div dir="rtl" style="margin:0;background:#f8fafc;padding:28px;font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#111827;text-align:right">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;padding:28px">
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:18px">Magic Flow</div>
        ${html}
        <hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0" />
        <p style="margin:0;font-weight:700">צוות Magic Flow — שירותי אוטומציה לעסקים</p>
        <p style="margin:4px 0;color:#6b7280">שלמה פופוביץ · <span dir="ltr">054-246-6340</span></p>
        <p style="margin:4px 0;color:#6b7280">© 2026 כל הזכויות שמורות</p>
        ${unsubscribe}
      </div>
    </div>
  `;
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

  const html = wrapWithFooter(input.html, input.unsubscribeUrl);
  const message = [
    `From: ${encodeHeader("Magic Flow")} <${config.from}>`,
    `To: <${input.to}>`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "."
  ].join("\r\n");

  await writeExpected(socket, message, ["250"]);
  await writeCommand(socket, "QUIT");
  socket.end();
}

export async function sendSystemEmail(input: SendEmailInput): Promise<boolean> {
  const config = getSmtpConfig();

  if (!config) {
    console.info(`[email:skipped] ${input.to} - ${input.subject}`);
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
