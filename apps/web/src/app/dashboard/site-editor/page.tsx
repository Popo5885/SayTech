import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye, LayoutTemplate, Save, Wand2 } from "lucide-react";
import { auth } from "../../../auth";
import { SuccessSubmitButton } from "../../../components/success-submit-button";
import {
  SITE_CONTENT_FIELDS,
  getDefaultSiteContent,
  getSiteContent,
  saveSiteContent,
  type SiteContentKey
} from "../../../lib/site-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function saveContentAction(formData: FormData) {
  "use server";

  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) {
    redirect("/login");
  }

  const values = Object.fromEntries(
    SITE_CONTENT_FIELDS.map((field) => [field.key, String(formData.get(field.key) ?? "")])
  ) as Partial<Record<SiteContentKey, string>>;

  await saveSiteContent(values, userId);

  revalidatePath("/");
  revalidatePath("/dashboard/site-editor");
  redirect("/dashboard/site-editor?saved=1");
}

export default async function SiteEditorPage({
  searchParams
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const content = await getSiteContent();
  const defaults = getDefaultSiteContent();
  const hasCustomContent = SITE_CONTENT_FIELDS.some((field) => content[field.key] !== defaults[field.key]);
  const sections = SITE_CONTENT_FIELDS.reduce<Record<string, typeof SITE_CONTENT_FIELDS[number][]>>((acc, field) => {
    acc[field.section] = acc[field.section] ?? [];
    acc[field.section].push(field);
    return acc;
  }, {});

  const sectionLabel: Record<string, string> = {
    hero: "פתיח ודף תדמית",
    features: "יכולות וכרטיסים",
    security: "אבטחה ואמון",
    pricing: "מחיר וקריאה לפעולה"
  };

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-blue-700">
              <LayoutTemplate className="h-4 w-4" />
              עורך אתר
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 md:text-4xl">
              שינוי טקסטים בדף שהלקוחות רואים
            </h1>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-8 text-slate-600">
              כאן אפשר לשנות כותרות, תיאור, מחיר וכרטיסי יכולות. השמירה נכנסת לבסיס הנתונים ומופיעה מיד בעמוד הבית.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              href="/"
              target="_blank"
            >
              <Eye className="h-4 w-4" />
              תצוגת אתר
            </Link>
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              חזרה לדשבורד
            </Link>
          </div>
        </div>

        {params?.saved === "1" ? (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800">
            התוכן נשמר בהצלחה והעמוד הציבורי עודכן.
          </div>
        ) : null}

        {!hasCustomContent ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-slate-950">עדיין לא נשמר תוכן מותאם</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  מוצגים ערכי ברירת מחדל של המוצר. אחרי השמירה הראשונה הם יישמרו כנתוני CMS אמיתיים בטבלת SiteContent.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <form action={saveContentAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          {Object.entries(sections).map(([section, fields]) => (
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={section}>
              <h2 className="text-xl font-black text-slate-950">{sectionLabel[section] ?? section}</h2>
              <div className="mt-5 grid gap-4">
                {fields.map((field) => (
                  <label className="block" key={field.key}>
                    <span className="text-sm font-black text-slate-700">{field.label}</span>
                    {field.input === "textarea" ? (
                      <textarea
                        className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-right text-sm font-semibold leading-7 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        defaultValue={content[field.key]}
                        name={field.key}
                      />
                    ) : (
                      <input
                        className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        defaultValue={content[field.key]}
                        name={field.key}
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <p className="text-sm font-black text-slate-500">תצוגה מקדימה מהירה</p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black text-emerald-700">{content.hero_badge}</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">{content.hero_title}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{content.hero_subtitle}</p>
            <div className="mt-4 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
              {content.primary_cta}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-black text-slate-500">מחיר</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{content.price_label}</p>
          </div>

          <div className="mt-5">
            <SuccessSubmitButton className="w-full">
              <Save className="ml-2 h-4 w-4" />
              שמירת תוכן האתר
            </SuccessSubmitButton>
          </div>
        </aside>
      </form>
    </main>
  );
}
