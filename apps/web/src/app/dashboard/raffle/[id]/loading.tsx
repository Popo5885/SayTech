export default function RaffleDashboardLoading() {
  return (
    <main className="mx-auto max-w-5xl animate-pulse pb-28 text-right" dir="rtl">
      <section className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(30,41,59,0.08)]">
        <div className="h-7 w-32 rounded-full bg-slate-100" />
        <div className="mt-5 h-10 w-64 rounded-2xl bg-slate-100" />
        <div className="mt-4 h-5 w-full max-w-lg rounded-full bg-slate-100" />
      </section>

      <section className="mt-5 grid gap-4">
        <div className="h-44 rounded-[30px] border border-slate-200 bg-white shadow-sm" />
        <div className="h-36 rounded-[30px] border border-slate-200 bg-white shadow-sm" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 rounded-[28px] border border-slate-200 bg-white shadow-sm" />
          <div className="h-32 rounded-[28px] border border-slate-200 bg-white shadow-sm" />
        </div>
      </section>

      <section className="mt-8">
        <div className="h-6 w-40 rounded-full bg-slate-100" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="h-28 rounded-[24px] border border-slate-200 bg-white" />
          <div className="h-28 rounded-[24px] border border-slate-200 bg-white" />
          <div className="h-28 rounded-[24px] border border-slate-200 bg-white" />
        </div>
      </section>
    </main>
  );
}
