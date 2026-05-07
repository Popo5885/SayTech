import { prisma } from "@lottery/db";

const db = prisma as any;

export const SITE_CONTENT_FIELDS = [
  {
    key: "brand_name",
    label: "שם המותג",
    section: "hero",
    input: "text",
    defaultValue: "Magic Flow Pro"
  },
  {
    key: "hero_badge",
    label: "תג עליון",
    section: "hero",
    input: "text",
    defaultValue: "מערכת SaaS לניהול WhatsApp, הגרלות ואנשי קשר"
  },
  {
    key: "hero_title",
    label: "כותרת ראשית",
    section: "hero",
    input: "textarea",
    defaultValue: "בונים אוטומציות WhatsApp כמו שיחה, לא כמו טופס"
  },
  {
    key: "hero_subtitle",
    label: "תיאור פתיחה",
    section: "hero",
    input: "textarea",
    defaultValue:
      "Magic Flow Pro מחבר בין עורך הודעות ויזואלי, מערכת הפניות בתשלום, QR Login, דף לקוח ו-CMS עברי שמאפשר לשנות את האתר בלי לגעת בקוד."
  },
  {
    key: "primary_cta",
    label: "כפתור ראשי",
    section: "hero",
    input: "text",
    defaultValue: "התחלת הרשמה"
  },
  {
    key: "secondary_cta",
    label: "כפתור משני",
    section: "hero",
    input: "text",
    defaultValue: "כניסה למערכת"
  },
  {
    key: "price_label",
    label: "מחיר מוצג",
    section: "pricing",
    input: "text",
    defaultValue: "החל מ-499 ₪"
  },
  {
    key: "feature_1_title",
    label: "יכולת 1 - כותרת",
    section: "features",
    input: "text",
    defaultValue: "עורך הודעות כמו WhatsApp"
  },
  {
    key: "feature_1_body",
    label: "יכולת 1 - טקסט",
    section: "features",
    input: "textarea",
    defaultValue:
      "כל שלב בבוט נבנה כבועה בשיחה, עם תצוגה חיה, מדיה ופורמטינג בדיוק כפי שהלקוח יקבל."
  },
  {
    key: "feature_2_title",
    label: "יכולת 2 - כותרת",
    section: "features",
    input: "text",
    defaultValue: "נקודות רק אחרי תשלום אמיתי"
  },
  {
    key: "feature_2_body",
    label: "יכולת 2 - טקסט",
    section: "features",
    input: "textarea",
    defaultValue:
      "20 נקודות נזקפות למפנה רק אחרי webhook תשלום מאומת. 100 נקודות שוות 100 ₪ הנחה."
  },
  {
    key: "feature_3_title",
    label: "יכולת 3 - כותרת",
    section: "features",
    input: "text",
    defaultValue: "CMS כמו וורדפרס"
  },
  {
    key: "feature_3_body",
    label: "יכולת 3 - טקסט",
    section: "features",
    input: "textarea",
    defaultValue:
      "בעל העסק יכול לשנות כותרות, טקסטים, מחיר ותוכן בדף התדמית מתוך הדשבורד."
  },
  {
    key: "security_title",
    label: "כותרת אבטחה",
    section: "security",
    input: "text",
    defaultValue: "אבטחה בלי הצגות"
  },
  {
    key: "security_body",
    label: "טקסט אבטחה",
    section: "security",
    input: "textarea",
    defaultValue:
      "סיסמאות באנגלית בלבד, QR Login מאובטח, בדיקת הרשאות בדשבורד וכפתורי הצלחה שמופיעים רק אחרי אישור שרת."
  }
] as const;

export type SiteContentKey = (typeof SITE_CONTENT_FIELDS)[number]["key"];

export type SiteContentMap = Record<SiteContentKey, string>;

const legacySiteSettingKey: Partial<Record<SiteContentKey, string>> = {
  hero_title: "landing_title",
  hero_subtitle: "landing_subtitle",
  price_label: "landing_price"
};

export function getDefaultSiteContent(): SiteContentMap {
  return Object.fromEntries(
    SITE_CONTENT_FIELDS.map((field) => [field.key, field.defaultValue])
  ) as SiteContentMap;
}

export async function getSiteContent(): Promise<SiteContentMap> {
  const content = getDefaultSiteContent();
  const keys = SITE_CONTENT_FIELDS.map((field) => field.key);

  try {
    const rows = await db.siteContent.findMany({
      where: {
        key: {
          in: keys
        }
      }
    });

    for (const row of rows) {
      if (row.key in content) {
        content[row.key as SiteContentKey] = String(row.value ?? "");
      }
    }

    return content;
  } catch (error) {
    console.warn("[site-content] SiteContent unavailable, trying legacy SiteSetting", error);
  }

  try {
    const legacyKeys = Object.values(legacySiteSettingKey).filter(Boolean);
    const rows = await db.siteSetting.findMany({
      where: {
        key: {
          in: legacyKeys
        }
      }
    });
    const legacy = new Map<string, string>(
      rows.map((row: any): [string, string] => [String(row.key), String(row.value ?? "")])
    );

    for (const [contentKey, settingKey] of Object.entries(legacySiteSettingKey)) {
      if (settingKey && legacy.has(settingKey)) {
        content[contentKey as SiteContentKey] = legacy.get(settingKey) ?? content[contentKey as SiteContentKey];
      }
    }
  } catch (error) {
    console.warn("[site-content] legacy SiteSetting unavailable, using defaults", error);
  }

  return content;
}

export async function saveSiteContent(
  values: Partial<Record<SiteContentKey, string>>,
  updatedByUserId?: string | null
) {
  const writes = SITE_CONTENT_FIELDS.map((field) => {
    const value = values[field.key]?.trim();

    return db.siteContent.upsert({
      where: {
        key: field.key
      },
      update: {
        label: field.label,
        value: value || field.defaultValue,
        section: field.section,
        updatedByUserId: updatedByUserId ?? null
      },
      create: {
        key: field.key,
        label: field.label,
        value: value || field.defaultValue,
        section: field.section,
        updatedByUserId: updatedByUserId ?? null
      }
    });
  });

  return Promise.all(writes);
}
