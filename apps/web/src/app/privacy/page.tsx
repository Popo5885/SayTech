import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <article className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 leading-8 text-slate-700 shadow-xl">
        <Link className="font-black text-slate-950" href="/">Magic Flow</Link>
        <h1 className="mt-8 text-4xl font-black text-slate-950">מדיניות פרטיות</h1>
        <p className="mt-5">Magic Flow אוספת מידע הדרוש להפעלת מערכת הגרלות WhatsApp: פרטי חשבון, פרטי קשר, נתוני קמפיינים, משתתפים, הודעות מערכת ולוגים תפעוליים.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">למה אנחנו משתמשים במידע?</h2>
        <p>כדי לפתוח חשבון, לאשר משתמשים, להקצות מספר למערכת, לנהל משתתפים, לסנכרן אנשי קשר, לשלוח מיילי מערכת ולשפר את השירות.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">שמירה ואבטחה</h2>
        <p>סיסמאות נשמרות כ-hash בלבד. טוקנים לחיבורים חיצוניים מיועדים להישמר מוצפנים. אין לשמור סודות בקוד או להעלות אותם ל-GitHub.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">יצירת קשר</h2>
        <p>לשאלות פרטיות אפשר לפנות לצוות Magic Flow: <span dir="ltr">aknvpupuch@gmail.com</span> או <span dir="ltr">054-246-6340</span>.</p>
      </article>
    </main>
  );
}
