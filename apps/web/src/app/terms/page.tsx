import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <article className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 leading-8 text-slate-700 shadow-xl">
        <Link className="font-black text-slate-950" href="/">Magic Flow</Link>
        <h1 className="mt-8 text-4xl font-black text-slate-950">תנאי שימוש</h1>
        <p className="mt-5">השימוש ב-Magic Flow מיועד לניהול הגרלות וקמפיינים עסקיים ב-WhatsApp בצורה חוקית, שקופה ומכבדת.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">אישור חשבון</h2>
        <p>כל חשבון חדש עובר בדיקה ידנית. צוות הניהול רשאי לאשר, לדחות, להשעות או להגביל חשבון לפי שיקולי אבטחה, איכות ושימוש הוגן.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">שימוש מותר</h2>
        <p>אין להשתמש במערכת לספאם, הטעיה, תוכן לא חוקי או שליחת הודעות ללא הסכמה מתאימה.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950">הגרלות</h2>
        <p>בעל העסק אחראי לוודא שההגרלה עומדת בכל דין רלוונטי. המערכת מספקת כלי ניהול ותיעוד, אך אינה מחליפה ייעוץ משפטי.</p>
      </article>
    </main>
  );
}
