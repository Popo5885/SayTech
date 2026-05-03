import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | Magic Flow",
  description: "מדיניות הפרטיות של Magic Flow."
};

const LAST_UPDATED = "1 במאי 2025";
const CONTACT_EMAIL = "aknvpupuch@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <article className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 leading-8 text-slate-700 shadow-xl">
        <Link className="font-black text-slate-950 hover:underline" href="/">Magic Flow</Link>
        <p className="mt-2 text-sm text-slate-400">עודכן לאחרונה: {LAST_UPDATED}</p>
        <h1 className="mt-6 text-4xl font-black text-slate-950">מדיניות פרטיות</h1>
        <p className="mt-4">
          Magic Flow מחויבת להגן על פרטיות המשתמשים. מסמך זה מסביר אילו נתונים אנו אוספים,
          כיצד אנו משתמשים בהם ומהן זכויותיכם.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">1. מי אנחנו?</h2>
        <p>
          Magic Flow היא מערכת SaaS לניהול הגרלות, קמפיינים ולידים באמצעות WhatsApp,
          המופעלת על-ידי צוות Magic Flow. לפרטי יצירת קשר ראו סעיף 10.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">2. איזה מידע אנו אוספים?</h2>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li><strong>פרטי חשבון:</strong> שם מלא, כתובת דוא&quot;ל, מספר טלפון וסיסמה (מאוחסנת כ-hash בלבד).</li>
          <li><strong>פרטי ארגון / Workspace:</strong> שם עסק, הגדרות קמפיין, תבניות הודעות ולוגים תפעוליים.</li>
          <li><strong>נתוני משתתפי הגרלות:</strong> מספר טלפון, שם, כרטיסים, הפניות, ודוא&quot;ל (אם הוזן מרצון).</li>
          <li><strong>נתוני שימוש:</strong> תאריך כניסה, פעולות שבוצעו ולוגים טכניים.</li>
          <li><strong>Google Integration:</strong> טוקן גישה לסנכרון אנשי קשר — בהסכמה מפורשת בלבד.</li>
          <li><strong>עוגיות:</strong> עוגיות חיוניות לאימות; עוגיות שיווק (Facebook Pixel) נטענות רק לאחר הסכמה.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-slate-950">3. למה אנו משתמשים במידע?</h2>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li>פתיחה, ניהול ואימות חשבונות משתמשים.</li>
          <li>הפעלת קמפיינים וניהול משתתפים.</li>
          <li>סנכרון אנשי קשר ל-Google Contacts (בהסכמה בלבד).</li>
          <li>שליחת הודעות מערכת ועדכונים הכרחיים.</li>
          <li>שיפור ביצועי המערכת ואבחון שגיאות.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-slate-950">4. שיתוף מידע עם צדדים שלישיים</h2>
        <p>
          אנו <strong>אינו</strong> מוכרים מידע אישי. מידע עשוי להיות מועבר לספקי שירות הכרחיים בלבד:
          תשתית ענן, Meta (WhatsApp Cloud API) ו-Google (Contacts API — בהסכמה).
          כל ספק מחויב בהסכם עיבוד נתונים ואינו רשאי להשתמש במידע לצרכיו.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">5. אבטחת מידע</h2>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li>הצפנת תקשורת באמצעות HTTPS / TLS.</li>
          <li>אחסון סיסמאות כ-hash (bcrypt) בלבד.</li>
          <li>הצפנת טוקנים ומפתחות API רגישים.</li>
          <li>Rate Limiting ואימות HMAC על כל Webhooks נכנסים.</li>
          <li>מיסוך מספרי טלפון וכתובות דוא&quot;ל בלוגים ציבוריים.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-slate-950">6. שמירת נתונים</h2>
        <p>
          נתוני חשבון נשמרים כל עוד החשבון פעיל. לאחר מחיקת חשבון, הנתונים יימחקו תוך 30 יום
          (למעט נתונים שחוק מחייב שמירתם). לוגים תפעוליים נשמרים עד 12 חודשים.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">7. עוגיות (Cookies)</h2>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li><strong>עוגיות חיוניות:</strong> נדרשות לאימות ולתפקוד הבסיסי. לא ניתן לכבותן.</li>
          <li><strong>עוגיות שיווק:</strong> כגון Facebook Pixel — נטענות רק לאחר הסכמה מפורשת.</li>
        </ul>
        <p className="mt-3">ניתן לשנות העדפות בכל עת דרך &quot;ניהול העדפות&quot; בבאנר שבתחתית העמוד.</p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">8. זכויותיכם</h2>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li>עיון במידע האישי שנשמר עליכם.</li>
          <li>תיקון מידע שגוי.</li>
          <li>מחיקת מידע (&quot;זכות להישכח&quot;).</li>
          <li>קבלת המידע בפורמט מובנה (ניוד נתונים).</li>
          <li>התנגדות לעיבוד מידע למטרות שיווק.</li>
        </ul>
        <p className="mt-3">
          לממוש זכויות אלה:{" "}
          <a className="font-bold text-blue-600 underline" href={"mailto:" + CONTACT_EMAIL} dir="ltr">
            {CONTACT_EMAIL}
          </a>
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">9. שינויים במדיניות</h2>
        <p>
          שינויים מהותיים יפורסמו בעמוד זה ויישלח עדכון לדוא&quot;ל הרשום.
          שימוש מתמשך לאחר עדכון מהווה הסכמה לגרסה החדשה.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">10. יצירת קשר</h2>
        <ul className="mt-3 list-none space-y-1">
          <li>דוא&quot;ל: <a className="font-bold text-blue-600 underline" href={"mailto:" + CONTACT_EMAIL} dir="ltr">{CONTACT_EMAIL}</a></li>
          <li>טלפון: <span dir="ltr">054-246-6340</span></li>
        </ul>

        <div className="mt-10 border-t border-slate-100 pt-6 text-sm text-slate-400">
          <Link href="/terms" className="underline hover:text-slate-700">תנאי שימוש</Link>
          {" · "}
          <Link href="/" className="underline hover:text-slate-700">חזרה לדף הבית</Link>
        </div>
      </article>
    </main>
  );
}
