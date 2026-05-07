/**
 * SayTech premium transactional email templates.
 *
 * All templates return raw HTML strings ready for sendSystemEmail().
 * Design: dark navy header, gradient CTA button, clean RTL layout, compliant footer.
 *
 * SMTP credentials are read from environment variables — never hardcoded here:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_USER=magicflow11284@gmail.com
 *   SMTP_PASS=<gmail-app-password>
 *   SMTP_FROM=magicflow11284@gmail.com
 *   SMTP_SECURE=true
 */

const BRAND_NAME = "SayTech";
const BRAND_WEBSITE = "https://saytech.co.il/";
const SUPPORT_PHONE = "054-246-6340"; // placeholder — replace in production

// ─── Shared design tokens ─────────────────────────────────────────────────────

const PURPLE_DARK = "#3b2f8f";
const PURPLE_MID = "#6048d4";
const PURPLE_LIGHT = "#8b5cf6";
const EMERALD = "#10b981";
const AMBER = "#f59e0b";
const SLATE_BG = "#f1f5f9";
const WHITE = "#ffffff";
const TEXT_DARK = "#0f172a";
const TEXT_MID = "#475569";

function saytechGradient(from: string, to: string) {
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

// ─── Shared layout wrappers ───────────────────────────────────────────────────

function emailShell(content: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background:${SLATE_BG};font-family:'Heebo',Arial,Helvetica,sans-serif;direction:rtl;text-align:right">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SLATE_BG};padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px">

          <!-- Header -->
          <tr>
            <td style="background:${saytechGradient(PURPLE_DARK, PURPLE_MID)};border-radius:24px 24px 0 0;padding:28px 32px;text-align:right">
              <div style="display:inline-flex;align-items:center;gap:10px">
                <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff">S</div>
                <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">${BRAND_NAME}</span>
              </div>
              <div style="margin-top:6px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.6);letter-spacing:0.5px">פתרונות אוטומציה חכמים לעסקים</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:${WHITE};padding:32px;border-right:1px solid #e2e8f0;border-left:1px solid #e2e8f0">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1e293b;border-radius:0 0 24px 24px;padding:24px 32px;text-align:right">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;font-weight:700;color:#94a3b8">${BRAND_NAME} | שירות לקוחות</p>
                    <p style="margin:6px 0 0;font-size:13px;color:#64748b">
                      לפניות ותמיכה:
                      <a href="tel:${SUPPORT_PHONE.replace(/-/g, "")}" style="color:#a78bfa;text-decoration:none;font-weight:700">${SUPPORT_PHONE}</a>
                    </p>
                    <p style="margin:6px 0 0;font-size:12px;color:#64748b">
                      <a href="${BRAND_WEBSITE}" style="color:#a78bfa;text-decoration:none" target="_blank">${BRAND_WEBSITE}</a>
                    </p>
                    <div style="margin-top:14px;padding-top:14px;border-top:1px solid #334155;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
                      <p style="margin:0;font-size:11px;color:#475569">© 2026 ${BRAND_NAME}. כל הזכויות שמורות.</p>
                      <a href="${unsubscribeUrl}" style="display:inline-block;font-size:11px;color:#64748b;text-decoration:underline">הסרה מרשימת התפוצה</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string, color = PURPLE_MID): string {
  return `<div style="text-align:center;margin:28px 0">
    <a href="${href}" style="display:inline-block;background:${saytechGradient(color, PURPLE_LIGHT)};color:#ffffff;text-decoration:none;border-radius:16px;padding:16px 32px;font-size:16px;font-weight:900;letter-spacing:-0.3px;box-shadow:0 8px 24px rgba(96,72,212,0.32)">
      ${label}
    </a>
  </div>`;
}

function sectionHeading(icon: string, title: string): string {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
    <span style="font-size:24px">${icon}</span>
    <h1 style="margin:0;font-size:22px;font-weight:900;color:${TEXT_DARK};letter-spacing:-0.5px">${title}</h1>
  </div>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${TEXT_MID};white-space:nowrap">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:${TEXT_DARK};font-weight:600">${value}</td>
  </tr>`;
}

function divider(): string {
  return `<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">`;
}

// ─── Template: Welcome / Account Setup ───────────────────────────────────────

export type WelcomeEmailInput = {
  recipientName: string;
  recipientEmail: string;
  setupCode: string;
  setupUrl: string;
  unsubscribeUrl: string;
};

export function buildWelcomeEmail(input: WelcomeEmailInput): string {
  const body = `
    ${sectionHeading("🎉", `ברוך הבא ל-${BRAND_NAME}!`)}
    <p style="margin:16px 0 0;font-size:15px;color:${TEXT_MID};line-height:1.8">
      שלום <strong style="color:${TEXT_DARK}">${input.recipientName}</strong>,<br>
      צוות ${BRAND_NAME} הכין עבורך חשבון אישי במערכת הגרלות WhatsApp. כדי להתחיל לעבוד, צור סיסמה והיכנס.
    </p>

    ${divider()}

    <!-- Code card -->
    <div style="background:${saytechGradient("#f5f3ff", "#ede9fe")};border:1px solid #c4b5fd;border-radius:18px;padding:24px;margin:20px 0;text-align:center">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#7c3aed;letter-spacing:0.5px;text-transform:uppercase">קוד הגדרת סיסמה</p>
      <div dir="ltr" style="font-size:34px;font-weight:900;color:${PURPLE_DARK};letter-spacing:8px;font-family:monospace">${input.setupCode}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#7c3aed;font-weight:600">תוקף הקוד: 30 דקות</p>
    </div>

    <p style="margin:20px 0;font-size:14px;color:${TEXT_MID};line-height:1.8;text-align:center">
      לחץ על הכפתור למטה, הזן את הקוד ובחר סיסמה חדשה.
    </p>

    ${ctaButton(input.setupUrl, "הגדרת סיסמה וכניסה למערכת ←")}

    ${divider()}

    <!-- Info table -->
    <div style="background:#f8fafc;border-radius:14px;padding:16px;margin-top:8px">
      <p style="margin:0 0 12px;font-size:12px;font-weight:900;color:${TEXT_MID};text-transform:uppercase;letter-spacing:0.5px">פרטי החשבון</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        ${infoRow("אימייל:", input.recipientEmail)}
        ${infoRow("מערכת:", `${BRAND_NAME} — הגרלות WhatsApp`)}
        ${infoRow("גישה:", "דשבורד ניהול הגרלה")}
      </table>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center">
      אם לא ביקשת חשבון זה, ניתן להתעלם ממייל זה בבטחה.
    </p>
  `;

  return emailShell(body, input.unsubscribeUrl);
}

// ─── Template: Raffle Stopped Confirmation ────────────────────────────────────

export type RaffleStoppedEmailInput = {
  recipientName: string;
  recipientEmail: string;
  campaignName: string;
  totalParticipants: number;
  totalTickets: number;
  totalSaved: number;
  dashboardUrl: string;
  unsubscribeUrl: string;
};

export function buildRaffleStoppedEmail(input: RaffleStoppedEmailInput): string {
  const body = `
    ${sectionHeading("🏆", "ההגרלה הופסקה בהצלחה")}
    <p style="margin:16px 0 0;font-size:15px;color:${TEXT_MID};line-height:1.8">
      שלום <strong style="color:${TEXT_DARK}">${input.recipientName}</strong>,<br>
      ההגרלה <strong style="color:${PURPLE_MID}">${input.campaignName}</strong> הסתיימה ובוטה בהצלחה. הבוט הושבת — לא ניתן להצטרף יותר.
    </p>

    ${divider()}

    <!-- Stats banner -->
    <div style="background:${saytechGradient(PURPLE_DARK, PURPLE_MID)};border-radius:20px;padding:24px;margin:20px 0;color:#fff;text-align:center">
      <p style="margin:0 0 16px;font-size:13px;font-weight:700;opacity:0.8;letter-spacing:0.5px;text-transform:uppercase">סיכום הגרלה</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="text-align:center;padding:8px">
            <div style="font-size:36px;font-weight:900;line-height:1">${input.totalParticipants}</div>
            <div style="font-size:12px;opacity:0.75;margin-top:4px;font-weight:600">משתתפים</div>
          </td>
          <td style="text-align:center;padding:8px;border-right:1px solid rgba(255,255,255,0.2);border-left:1px solid rgba(255,255,255,0.2)">
            <div style="font-size:36px;font-weight:900;line-height:1">${input.totalTickets}</div>
            <div style="font-size:12px;opacity:0.75;margin-top:4px;font-weight:600">כרטיסים</div>
          </td>
          <td style="text-align:center;padding:8px">
            <div style="font-size:36px;font-weight:900;line-height:1;color:#6ee7b7">${input.totalSaved}</div>
            <div style="font-size:12px;opacity:0.75;margin-top:4px;font-weight:600">שמרו קשר</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Status chips -->
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin:20px 0">
      <div style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:8px 14px">
        <span style="color:${EMERALD};font-size:14px">✓</span>
        <span style="font-size:13px;font-weight:700;color:#166534">ההגרלה הסתיימה</span>
      </div>
      <div style="display:inline-flex;align-items:center;gap:6px;background:#fefce8;border:1px solid #fef08a;border-radius:20px;padding:8px 14px">
        <span style="color:${AMBER};font-size:14px">⚡</span>
        <span style="font-size:13px;font-weight:700;color:#92400e">הבוט הושבת</span>
      </div>
    </div>

    <p style="margin:20px 0;font-size:14px;color:${TEXT_MID};line-height:1.8">
      ניתן לצפות בכל נתוני ההגרלה, לייצא את רשימת המשתתפים ולהוריד את אנשי הקשר דרך הדשבורד.
    </p>

    ${ctaButton(input.dashboardUrl, "כניסה לדשבורד ההגרלה ←", EMERALD.replace("#", "").startsWith("1") ? "#059669" : EMERALD)}

    ${divider()}

    <div style="background:#fafafa;border-radius:14px;padding:16px;text-align:right">
      <p style="margin:0 0 12px;font-size:12px;font-weight:900;color:${TEXT_MID};text-transform:uppercase;letter-spacing:0.5px">פרטי ההגרלה שהסתיימה</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        ${infoRow("שם הגרלה:", input.campaignName)}
        ${infoRow("הופסקה ב:", new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }))}
        ${infoRow("אחוז שמרו:", `${input.totalParticipants > 0 ? Math.round((input.totalSaved / input.totalParticipants) * 100) : 0}%`)}
      </table>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center">
      מייל זה נשלח אוטומטית ע״י ${BRAND_NAME} בעקבות סיום ההגרלה.
    </p>
  `;

  return emailShell(body, input.unsubscribeUrl);
}

// ─── Template: Account Approved ───────────────────────────────────────────────

export type AccountApprovedEmailInput = {
  recipientName: string;
  loginUrl: string;
  unsubscribeUrl: string;
};

export function buildAccountApprovedEmail(input: AccountApprovedEmailInput): string {
  const body = `
    ${sectionHeading("✅", "החשבון שלך אושר!")}
    <p style="margin:16px 0 0;font-size:15px;color:${TEXT_MID};line-height:1.8">
      שלום <strong style="color:${TEXT_DARK}">${input.recipientName}</strong>,<br>
      צוות ${BRAND_NAME} אישר את חשבונך. אפשר להיכנס ולהתחיל לעבוד עם מערכת הגרלות WhatsApp.
    </p>

    ${divider()}

    <div style="background:${saytechGradient("#f0fdf4","#dcfce7")};border:1px solid #bbf7d0;border-radius:18px;padding:20px;margin:20px 0;text-align:center">
      <div style="font-size:48px">🎊</div>
      <p style="margin:8px 0 0;font-size:16px;font-weight:900;color:#166534">ברוך הבא ל-${BRAND_NAME}!</p>
      <p style="margin:6px 0 0;font-size:13px;color:#166534;opacity:0.8">החשבון שלך פעיל ומוכן לשימוש</p>
    </div>

    ${ctaButton(input.loginUrl, "כניסה למערכת ←")}

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center">
      לכל שאלה אנחנו כאן: <a href="tel:${SUPPORT_PHONE.replace(/-/g,"")}" style="color:${PURPLE_LIGHT};text-decoration:none">${SUPPORT_PHONE}</a>
    </p>
  `;

  return emailShell(body, input.unsubscribeUrl);
}
