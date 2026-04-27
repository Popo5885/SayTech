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
  REFERRER_PROMPT: "שאלת מי הזמין אותך",
  SAVE_CONTACT_PROMPT: "בדיקת שמירת איש קשר",
  REGISTRATION_PAUSED: "הודעת עצירה",
  MAIN_MENU: "תפריט לקוח חוזר",
  LINK: "קישור אישי",
  JOIN_WHATSAPP_PROMPT: "טקסט פתיחת WhatsApp מהקישור",
  STATUS_TICKETS: "סטטוס וכרטיסים",
  WINNER: "הודעת זוכה",
  SELF_STATUS: "סטטוס מלא",
  REFERRAL_UPDATE: "עדכון למפנה",
  LEADERBOARD_SUMMARY: "סיכום מובילים"
};

const defaultByKey: Record<MessageTemplateKey, string> = {
  WELCOME:
    "ברוכים הבאים להגרלה שלנו 🎉\nכדי שנרשום אותך כמו שצריך, איך קוראים לך?",
  REFERRER_PROMPT:
    "מעולה {{name}} 💛\nמי הזמין אותך להגרלה? אפשר לשלוח שם או מספר טלפון. אם אף אחד לא הזמין, כתבי \"אין\".",
  SAVE_CONTACT_PROMPT:
    "יש רק שלב אחד קטן כדי שההשתתפות שלך תאושר:\nחובה לשמור את המספר שלנו באנשי הקשר שלך 📱\n\nלמה זה חשוב?\nכי ההגרלה וההכרזה על הזוכים יעלו אצלנו בסטטוס. בלי לשמור אותנו לא תוכלי לראות עדכונים אם זכית.",
  REGISTRATION_PAUSED:
    "אין בעיה. כרגע עצרנו את הרישום שלך.\nכשתשמרי את המספר שלנו, שלחי \"שמרתי\" ונמשיך בדיוק מאותה נקודה.",
  MAIN_MENU: "בחרי מה תרצי לקבל עכשיו:",
  LINK:
    "איזה כיף {{name}}! נרשמת בהצלחה 🎟️\nזה הקישור האישי שלך לשיתוף:\n{{link}}\n\nכל משתתף שמצטרף דרכך מגדיל את הסיכוי שלך.",
  JOIN_WHATSAPP_PROMPT:
    "היי, הגעתי דרך הקישור להצטרפות ל{{campaign_name}}. קוד ההפניה שלי הוא {{ref}}.",
  STATUS_TICKETS:
    "היי {{name}}, יש לך כרגע {{tickets}} כרטיסים ו-{{referrals}} הפניות מאושרות.\nהמיקום שלך כרגע: #{{rank}}.",
  WINNER:
    "ברכות {{name}}! זכית בהגרלה 🎉\nניצור איתך קשר במספר {{contact_phone}}.",
  SELF_STATUS:
    "היי {{name}}, יש לך {{tickets}} כרטיסים ו-{{referrals}} הפניות.\nהמיקום שלך: #{{rank}}\n\nהקישור האישי שלך:\n{{link}}\n\nהמובילים כרגע:\n{{top10}}",
  REFERRAL_UPDATE:
    "חדשות טובות {{name}} 🎉\nהצטרף משתתף דרך הקישור שלך. עכשיו יש לך {{referrals}} הפניות ו-{{tickets}} כרטיסים.",
  LEADERBOARD_SUMMARY:
    "המובילים כרגע:\n{{top10}}"
};

const interactiveDefaults: Partial<Record<MessageTemplateKey, TemplateInteractiveConfig>> = {
  SAVE_CONTACT_PROMPT: {
    kind: "BUTTONS",
    options: [
      { id: "saved_contact_yes", label: "שמרתי" },
      { id: "saved_contact_no", label: "לא שמרתי" }
    ]
  },
  MAIN_MENU: {
    kind: "LIST",
    buttonText: "פתחי תפריט",
    title: "מה תרצי לעשות?",
    footer: "אפשר לבחור בכל רגע מחדש",
    options: [
      {
        id: "menu_status",
        label: "כמה כרטיסים יש לי",
        description: "בדיקת מצב אישי וכמות כרטיסים"
      },
      {
        id: "menu_link",
        label: "לינק אישי",
        description: "שליחת קישור ההפניה שלך"
      },
      {
        id: "menu_winner",
        label: "רשימת זוכים",
        description: "עדכון על הגרלה וזוכים"
      }
    ]
  }
};

const defaultEnabledByKey: Partial<Record<MessageTemplateKey, boolean>> = {
  REFERRER_PROMPT: false
};

export const TEMPLATE_EDITOR_ORDER: MessageTemplateKey[] = [
  "WELCOME",
  "SAVE_CONTACT_PROMPT",
  "REGISTRATION_PAUSED",
  "MAIN_MENU",
  "LINK",
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
      return "הודעת הכניסה הראשונה, כולל טקסט פתיחה ושאלה לשם.";
    case "REFERRER_PROMPT":
      return "השאלה שנשלחת אחרי קבלת השם כדי לזהות מי הזמין את הלקוח.";
    case "SAVE_CONTACT_PROMPT":
      return "הודעת האישור ששואלת אם נשמר איש הקשר, עם כפתורים.";
    case "REGISTRATION_PAUSED":
      return "הודעה שנשלחת אם הלקוח עדיין לא שמר את המספר.";
    case "MAIN_MENU":
      return "תפריט הפעולות של משתמשים חוזרים.";
    case "LINK":
      return "הודעת הצלחה עם הקישור האישי לשיתוף.";
    case "JOIN_WHATSAPP_PROMPT":
      return "הטקסט שנפתח ב-WhatsApp אחרי לחיצה על קישור ההצטרפות. קוד ההפניה יישמר אוטומטית כדי שנזהה מי הזמין.";
    case "STATUS_TICKETS":
      return "סטטוס אישי: כרטיסים, הפניות ומיקום.";
    case "WINNER":
      return "הודעת זכייה סופית.";
    case "REFERRAL_UPDATE":
      return "עדכון למפנה כשמשתתף חדש הצטרף דרכו.";
    case "SELF_STATUS":
      return "גרסה מלאה של הסטטוס האישי.";
    case "LEADERBOARD_SUMMARY":
      return "סיכום כללי של המובילים.";
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
  const validation = validateTemplate(template);

  if (!validation.valid) {
    throw new Error(
      `Unknown template variables: ${validation.invalidVariables.join(", ")}`
    );
  }

  return template.replace(VARIABLE_PATTERN, (_, variable: keyof TemplatePreviewContext) => {
    const value = values[variable];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function buildTemplatePreviewContext(
  overrides: Partial<TemplatePreviewContext> = {}
): TemplatePreviewContext {
  return {
    name: "יעל",
    tickets: 8,
    link: "https://example.com/join/spring-2026?ref=AB12CD34",
    referrals: 5,
    rank: 3,
    top10: "1. ש***ה - 12 הפניות\n2. נ***ה - 9 הפניות\n3. י***ל - 5 הפניות",
    contact_phone: "+972501234567",
    campaign_name: "הגרלת האביב",
    ref: "AB12CD34",
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
