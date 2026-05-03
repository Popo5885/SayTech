import {
  SUPPORTED_TEMPLATE_VARIABLES,
  type CampaignMessageTemplate,
  type CampaignTemplateUpdateInput,
  type MediaType,
  type MessageTemplateKey,
  type TemplateInteractiveConfig,
  type TemplatePreviewContext
} from "./domain";

const VARIABLE_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g;

const labelByKey: Record<MessageTemplateKey, string> = {
  WELCOME: "הודעת פתיחה ובקשת שם",
  EMAIL_PROMPT: "בקשת כתובת אימייל",
  REFERRER_PROMPT: "שאלת מפנה ידנית",
  SAVE_CONTACT_PROMPT: "בקשת שמירת איש קשר",
  REGISTRATION_PAUSED: "הודעת עצירה",
  MAIN_MENU: "תפריט למשתתף חוזר",
  LINK: "שליחת קישור אישי",
  GROUP_INVITE: "הזמנה לקבוצה",
  JOIN_WHATSAPP_PROMPT: "טקסט פתיחת WhatsApp מהקישור",
  STATUS_TICKETS: "בדיקת כרטיסים",
  WINNER: "הודעת זכייה",
  SELF_STATUS: "סטטוס אישי מלא",
  REFERRAL_UPDATE: "עדכון למפנה",
  LEADERBOARD_SUMMARY: "סיכום מובילים"
};

const defaultByKey: Record<MessageTemplateKey, string> = {
  WELCOME:
    "שלום {{name}}, ברוכים הבאים ל{{campaign_name}}.\nכדי להשלים הרשמה, נבקש לשמור את איש הקשר שלנו ואז תקבלו קישור אישי לשיתוף.",
  EMAIL_PROMPT:
    "מעולה {{name}}!\nכדי שנוכל לעדכן אותך על זכיות ומבצעים, שלח/י לנו את כתובת המייל שלך.\n(אם אין לך מייל או שאת/ה מעדיף/ה לדלג — כתוב/י: דלג)",
  REFERRER_PROMPT:
    "מי הזמין אותך להגרלה?\nאפשר לשלוח שם או מספר טלפון. אם אף אחד לא הזמין אותך, כתבו: אין.",
  SAVE_CONTACT_PROMPT:
    "כדי לקבל עדכונים על ההגרלה, חשוב לשמור אותנו באנשי הקשר.\nאחרי ששמרת, לחצו על הכפתור: שמרתי.",
  REGISTRATION_PAUSED:
    "אין בעיה. נעצור כאן.\nאחרי שתשמרו את איש הקשר, כתבו לנו שמרתי ונמשיך בדיוק מאותה נקודה.",
  MAIN_MENU: "מה תרצו לעשות עכשיו?",
  LINK:
    "מעולה {{name}}, ההרשמה הושלמה.\nזה הקישור האישי שלך לשיתוף:\n{{link}}\n\nכל מי שמצטרף דרך הקישור שלך מוסיף לך כרטיסים.",
  GROUP_INVITE:
    "איזה כיף שהצטרפת {{name}}! 🎉\nלחצ/י על הקישור הבא כדי להיכנס לקבוצת ה-VIP שלנו:\n{{group_invite_link}}",
  JOIN_WHATSAPP_PROMPT:
    "היי, אשמח להצטרף ל{{campaign_name}}. הגעתי דרך {{ref}}.",
  STATUS_TICKETS:
    "שלום {{name}}, יש לך כרגע {{tickets}} כרטיסים ו-{{referrals}} הפניות מאושרות.\nהמיקום שלך: #{{rank}}.",
  WINNER:
    "ברכות {{name}}, זכית ב{{campaign_name}}.\nניצור איתך קשר במספר {{contact_phone}}.",
  SELF_STATUS:
    "שלום {{name}}, יש לך {{tickets}} כרטיסים ו-{{referrals}} הפניות.\nהמיקום שלך: #{{rank}}\n\nהקישור האישי שלך:\n{{link}}\n\nהמובילים כרגע:\n{{top10}}",
  REFERRAL_UPDATE:
    "עדכון טוב, {{name}}.\nמשתתף חדש הצטרף דרך הקישור שלך. עכשיו יש לך {{referrals}} הפניות ו-{{tickets}} כרטיסים.",
  LEADERBOARD_SUMMARY:
    "המובילים כרגע:\n{{top10}}"
};

const interactiveDefaults: Partial<Record<MessageTemplateKey, TemplateInteractiveConfig>> = {
  EMAIL_PROMPT: {
    kind: "BUTTONS",
    options: [
      { id: "skip_email", label: "דלג" }
    ]
  },
  SAVE_CONTACT_PROMPT: {
    kind: "BUTTONS",
    options: [
      { id: "saved_contact_yes", label: "שמרתי" },
      { id: "saved_contact_no", label: "עדיין לא שמרתי" }
    ]
  },
  MAIN_MENU: {
    kind: "LIST",
    buttonText: "פתח תפריט",
    title: "פעולות זמינות",
    footer: "אפשר לבחור פעולה בכל רגע",
    options: [
      {
        id: "menu_status",
        label: "כמה כרטיסים יש לי",
        description: "בדיקת מצב אישי"
      },
      {
        id: "menu_link",
        label: "הקישור שלי",
        description: "קבלת קישור ההפניה"
      },
      {
        id: "menu_winner",
        label: "רשימת זוכים",
        description: "צפייה בזוכים שפורסמו"
      }
    ]
  }
};

const defaultEnabledByKey: Partial<Record<MessageTemplateKey, boolean>> = {
  EMAIL_PROMPT: false,
  REFERRER_PROMPT: false,
  GROUP_INVITE: false
};

export const TEMPLATE_EDITOR_ORDER: MessageTemplateKey[] = [
  "WELCOME",
  "EMAIL_PROMPT",
  "SAVE_CONTACT_PROMPT",
  "REGISTRATION_PAUSED",
  "MAIN_MENU",
  "LINK",
  "GROUP_INVITE",
  "JOIN_WHATSAPP_PROMPT",
  "STATUS_TICKETS",
  "WINNER",
  "REFERRAL_UPDATE"
];

export function getTemplateLabel(key: MessageTemplateKey): string {
  return labelByKey[key];
}

export function getTemplateDescription(key: MessageTemplateKey): string {
  switch (key) {
    case "WELCOME":
      return "ההודעה הראשונה שהמשתתף מקבל אחרי שהבוט מזהה אותו.";
    case "EMAIL_PROMPT":
      return "בקשה למשתתף לשלוח כתובת מייל לעדכונים על זכיות ומבצעים.";
    case "REFERRER_PROMPT":
      return "שאלה ידנית למקרה שאין קוד מפנה בקישור.";
    case "SAVE_CONTACT_PROMPT":
      return "בקשה פשוטה לשמור את איש הקשר כדי לראות עדכונים ב-WhatsApp.";
    case "REGISTRATION_PAUSED":
      return "הודעה שנשלחת אם המשתתף עדיין לא שמר את איש הקשר.";
    case "MAIN_MENU":
      return "תפריט קצר למשתתפים שחוזרים לבוט.";
    case "LINK":
      return "הודעת הסיום עם הקישור האישי לשיתוף.";
    case "GROUP_INVITE":
      return "הזמנה אוטומטית לקבוצת VIP/WhatsApp אחרי השלמת הרשמה.";
    case "JOIN_WHATSAPP_PROMPT":
      return "הטקסט שנפתח אוטומטית ב-WhatsApp מתוך קישור ההצטרפות.";
    case "STATUS_TICKETS":
      return "תשובה קצרה על מספר כרטיסים והפניות.";
    case "WINNER":
      return "הודעה לזוכה אחרי הגרלה אמיתית.";
    case "REFERRAL_UPDATE":
      return "עדכון למשתתף כשמישהו חדש הצטרף דרכו.";
    case "SELF_STATUS":
      return "סטטוס אישי מלא כולל הקישור האישי.";
    case "LEADERBOARD_SUMMARY":
      return "סיכום קצר של המובילים.";
    default:
      return "";
  }
}

export function createDefaultTemplates(campaignId: string): CampaignMessageTemplate[] {
  return (Object.keys(labelByKey) as MessageTemplateKey[]).map((key) => ({
    id: `${campaignId}_${key.toLowerCase()}`,
    campaignId,
    key,
    label: labelByKey[key],
    value: defaultByKey[key],
    isEnabled: defaultEnabledByKey[key] ?? true,
    mediaUrl: null,
    mediaType: null,
    interactive: interactiveDefaults[key] ? cloneInteractiveConfig(interactiveDefaults[key]) : null
  }));
}

export function normalizeInteractiveConfig(
  interactive: TemplateInteractiveConfig | null | undefined
): TemplateInteractiveConfig | null {
  if (!interactive || interactive.kind === "NONE") {
    return null;
  }

  return {
    kind: interactive.kind,
    title: interactive.title?.trim() || null,
    footer: interactive.footer?.trim() || null,
    buttonText: interactive.buttonText?.trim() || null,
    options: (interactive.options ?? [])
      .map((option, index) => ({
        id: option.id?.trim() || `option_${index + 1}`,
        label: option.label?.trim() || `אפשרות ${index + 1}`,
        description: option.description?.trim() || null
      }))
      .filter((option) => option.label.length > 0)
  };
}

export function validateTemplate(template: string): {
  valid: boolean;
  invalidVariables: string[];
} {
  const invalidVariables = new Set<string>();

  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    if (!SUPPORTED_TEMPLATE_VARIABLES.includes(match[1] as never)) {
      invalidVariables.add(match[1]);
    }
  }

  return {
    valid: invalidVariables.size === 0,
    invalidVariables: Array.from(invalidVariables)
  };
}

export function renderTemplate(
  template: string,
  values: TemplatePreviewContext
): string {
  return template.replace(VARIABLE_PATTERN, (match, variable: keyof TemplatePreviewContext) => {
    const value = values[variable];
    return value === undefined || value === null ? match : String(value);
  });
}

export function buildTemplatePreviewContext(
  overrides: Partial<TemplatePreviewContext> = {}
): TemplatePreviewContext {
  return {
    name: "שם המשתתף",
    tickets: 0,
    link: "https://example.com/join/campaign?ref=AB12CD34",
    referrals: 0,
    rank: 0,
    top10: "עדיין אין משתתפים",
    contact_phone: "+972501234567",
    campaign_name: "שם ההגרלה שלך",
    ref: "AB12CD34",
    email: "user@example.com",
    group_invite_link: "https://chat.whatsapp.com/example",
    ...overrides
  };
}

export function upsertTemplateValue(
  templates: CampaignMessageTemplate[],
  key: MessageTemplateKey,
  value: string
): CampaignMessageTemplate[] {
  return templates.map((template) =>
    template.key === key ? { ...template, value } : template
  );
}

export function upsertTemplatePayload(
  templates: CampaignMessageTemplate[],
  input: CampaignTemplateUpdateInput
): CampaignMessageTemplate[] {
  return templates.map((template) =>
    template.key === input.key
      ? {
          ...template,
          value: input.value,
          isEnabled: input.isEnabled ?? template.isEnabled,
          mediaUrl: input.mediaUrl ?? template.mediaUrl,
          mediaType: input.mediaType ?? template.mediaType,
          interactive:
            input.interactive === undefined
              ? template.interactive
              : normalizeInteractiveConfig(input.interactive)
        }
      : template
  );
}

export function inferMediaTypeFromMimeType(mimeType: string): MediaType | null {
  if (mimeType.startsWith("image/")) {
    return "IMAGE";
  }

  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }

  return null;
}

function cloneInteractiveConfig(
  interactive: TemplateInteractiveConfig
): TemplateInteractiveConfig {
  return {
    kind: interactive.kind,
    title: interactive.title ?? null,
    footer: interactive.footer ?? null,
    buttonText: interactive.buttonText ?? null,
    options: interactive.options.map((option) => ({ ...option }))
  };
}
