import Link from "next/link";

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <article className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 leading-8 text-slate-700 shadow-xl">
        <Link className="font-black text-slate-950" href="/">Magic Flow</Link>
        <h1 className="mt-8 text-4xl font-black text-slate-950">מדיניות נגישות</h1>
        <p className="mt-5">Magic Flow שואפת להיות מערכת פשוטה ונגישה לכל משתמש, גם למי שלא רגיל לעבוד עם מערכות טכנולוגיות.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">כלי נגישות באתר</h2>
        <p>באתר מופיע כפתור נגישות קבוע המאפשר הגדלת טקסט, ניגודיות גבוהה, גווני אפור, הדגשת קישורים ועצירת אנימציות.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">שפה ופשטות</h2>
        <p>המערכת נכתבת בעברית מלאה, עם פעולות קצרות וברורות, מצבים ריקים פשוטים והדרכות צעד אחר צעד.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">יצירת קשר בנושא נגישות</h2>
        <p>אם נתקלת בקושי, אפשר לפנות לצוות Magic Flow בטלפון <span dir="ltr">054-246-6340</span> או במייל <span dir="ltr">aknvpupuch@gmail.com</span>.</p>
      </article>
    </main>
  );
}
