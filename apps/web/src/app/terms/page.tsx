import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "תנאי שימוש | Magic Flow",
  description: "תנאי השימוש של Magic Flow."
};

const LAST_UPDATED = "1 במאי 2025";
const CONTACT_EMAIL = "aknvpupuch@gmail.com";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <article className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 leading-8 text-slate-700 shadow-xl">
        <Link className="font-black text-slate-950 hover:underline" href="/">Magic Flow</Link>
        <p className="mt-2 text-sm text-slate-400">עודכן לאחרונה: {LAST_UPDATED}</p>
        <h1 className="mt-6 text-4xl font-black text-slate-950">תנאי שימוש</h1>
        <p className="mt-4">
          ברוכים הבאים ל-<strong>Magic Flow</strong>. בגישה לשירות ובשימוש בו אתם מסכימים לתנאים
          המפורטים במסמך זה. נא קראו אותם בעיון לפני הפעלת החשבון.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">1. הגדרות</h2>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li><strong>&quot;השירות&quot;</strong> — פלטפורמת Magic Flow לניהול הגרלות ב-WhatsApp.</li>
          <li><strong>&quot;המשתמש&quot;</strong> — כל עסק או אדם שנרשם לשירות.</li>
          <li><strong>&quot;משתתף&quot;</strong> — אדם שהצטרף לקמפיין הגרלה דרך WhatsApp.</li>
          <li><strong>&quot;Workspace&quot;</strong> — סביבת העבודה הנפרדת לכל לקוח במערכת.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-slate-950">2. כשירות ואישור חשבון</h2>
        <p>
          השירות מיועד לעסקים ולבעלי מקצוע מגיל 18 ומעלה. כל חשבון חדש עובר בדיקה ידנית
          על-ידי צוות Magic Flow. הצוות שומר לעצמו את הזכות לאשר, לדחות, להשעות או לסגור
          חשבון בהתאם לשיקולי אבטחה, עמידה בתנאים ושימוש הוגן, ללא צורך בהנמקה.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">3. שימוש מותר</h2>
        <p>המשתמש מתחייב לעשות שימוש בשירות בהתאם לחוק, ובפרט:</p>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li>לשלוח הודעות רק למי שנתן הסכמה מפורשת לקבלן.</li>
          <li>לנהל הגרלות בצורה שקופה, הוגנת ובהתאם לדיני הגרלות ופרסים.</li>
          <li>לא להשתמש בשירות להפצת ספאם, הונאה, תוכן פוגעני או בלתי חוקי.</li>
          <li>לא לבצע פעולות שעלולות לפגוע בתשתית המערכת או בלקוחות אחרים.</li>
          <li>לא לנסות לעקוף מנגנוני אבטחה או לגשת לנתוני לקוחות אחרים.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-slate-950">4. הגרלות ואחריות משפטית</h2>
        <p>
          המשתמש הוא האחראי הבלעדי לוודא שההגרלה עומדת בכל דין חל, לרבות אישורים, דיווחים
          ותשלום מיסים. Magic Flow מספקת כלים טכניים בלבד ואינה מעניקה ייעוץ משפטי.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">5. קניין רוחני</h2>
        <p>
          כל קוד, עיצוב, לוגו ושם מסחרי של Magic Flow הם קניינה הבלעדי. השימוש בשירות אינו
          מקנה למשתמש זכויות קניין כלשהן. תוכן שנוצר על-ידי המשתמש (תבניות, שמות קמפיין) שייך למשתמש.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">6. תשלומים וביטולים</h2>
        <p>
          תנאי התשלום ומחירי המנוי נקבעים בנפרד בהסכם מול כל לקוח. במקרה של ביטול,
          הגישה תופסק בתום תקופת המנוי ששולמה.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">7. הגבלת אחריות</h2>
        <p>
          Magic Flow מספקת את השירות &quot;כמות שהוא&quot; (AS IS). איננו אחראים לנזקים עקיפים
          הנובעים משימוש בשירות. אחריותנו הכוללת לא תעלה על הסכום ששולם בשלושת החודשים שקדמו לאירוע.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">8. זמינות השירות</h2>
        <p>
          אנו שואפים לזמינות גבוהה אך אין אנו ערבים לזמינות של 100%. תחזוקה, עדכונים ואירועים
          חיצוניים (Meta, WhatsApp, Google) עלולים לגרום להפסקות שירות.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">9. סיום ההסכם</h2>
        <p>
          כל צד רשאי לסיים את ההסכם בהודעה מראש. Magic Flow רשאית לסגור חשבון מיידית במקרה
          של הפרה מהותית. לאחר הסגירה, נתוני הלקוח יישמרו 30 יום ולאחר מכן יימחקו.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">10. שינויים בתנאים</h2>
        <p>
          שינויים מהותיים יפורסמו ויישלח עדכון בדוא&quot;ל 14 יום מראש. המשך שימוש לאחר מועד
          כניסת השינויים לתוקף מהווה הסכמה לתנאים המעודכנים.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">11. דין חל וסמכות שיפוט</h2>
        <p>
          תנאים אלה כפופים לדיני מדינת ישראל. כל סכסוך יובא לפתרון בפני בתי המשפט המוסמכים במחוז תל אביב.
        </p>

        <h2 className="mt-10 text-2xl font-black text-slate-950">12. צור קשר</h2>
        <ul className="mt-3 list-none space-y-1">
          <li>דוא&quot;ל: <a className="font-bold text-blue-600 underline" href={"mailto:" + CONTACT_EMAIL} dir="ltr">{CONTACT_EMAIL}</a></li>
          <li>טלפון: <span dir="ltr">054-246-6340</span></li>
        </ul>

        <div className="mt-10 border-t border-slate-100 pt-6 text-sm text-slate-400">
          <Link href="/privacy" className="underline hover:text-slate-700">מדיניות פרטיות</Link>
          {" · "}
          <Link href="/" className="underline hover:text-slate-700">חזרה לדף הבית</Link>
        </div>
      </article>
    </main>
  );
}
