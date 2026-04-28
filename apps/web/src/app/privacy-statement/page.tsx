import Link from "next/link";

export default function PrivacyStatementPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <article className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 leading-8 text-slate-700 shadow-xl">
        <Link className="font-black text-slate-950" href="/">Magic Flow</Link>
        <h1 className="mt-8 text-4xl font-black text-slate-950">הצהרת פרטיות</h1>
        <p className="mt-5">המערכת נבנתה כדי להציג רק מידע אמיתי שנשמר במערכת או מגיע משירות החיבור. לא מוצגים נתוני דמו כלקוח פעיל.</p>
        <p className="mt-4">משתתפים בהגרלות רואים הודעות WhatsApp בהתאם לקמפיין של בעל העסק. מספרי טלפון נשמרים בפורמט בינלאומי כדי לאפשר שמירה תקינה באנשי קשר וב-WhatsApp.</p>
        <p className="mt-4">ניתן לבקש מחיקה, תיקון או הסרה מרשימת תפוצה דרך פרטי הקשר של צוות Magic Flow.</p>
      </article>
    </main>
  );
}
