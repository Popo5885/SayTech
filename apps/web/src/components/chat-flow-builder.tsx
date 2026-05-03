"use client";

/**
 * ChatFlowBuilder — a visual WhatsApp-style chat-thread editor.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Phone frame (sticky)  │  Edit panel (active bubble)    │
 *   │  All bubbles visible   │  textarea + variables + media  │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Features:
 *  - Full conversation flow visible as WhatsApp bubbles
 *  - Click any bubble → opens its editor inline on the right
 *  - Real-time preview: editing updates the bubble immediately
 *  - Drag-to-reorder bot bubbles (coming: template reorder via DnD)
 *  - Variable chips, media upload, AI draft — same as MessageEditor
 *  - Toggle: enable / disable individual bubbles
 */

import { useRef, useState, useTransition } from "react";
import {
  TEMPLATE_EDITOR_ORDER,
  buildTemplatePreviewContext,
  getTemplateDescription,
  renderTemplate,
  validateTemplate
} from "@lottery/core/templates";
import type {
  CampaignMessageTemplate,
  ConnectionStatus,
  MessageTemplateKey
} from "@lottery/core/domain";
import { Badge, Button, Textarea, cn } from "@lottery/ui";
import {
  MessageCircle,
  User,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  Save
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────────────────── */

const DEMO_CTX = buildTemplatePreviewContext({
  name: "יוסי כהן",
  tickets: 5,
  referrals: 2,
  rank: 3,
  ref: "YOSI2025",
  contact_phone: "0501234567",
  campaign_name: "הגרלת הקיץ",
  link: "https://magic.flow/j/YOSI2025",
  top10: "1. דנה - 12\n2. אבי - 9\n3. יוסי - 5",
  email: "",
  group_invite_link: ""
});

function safeRender(tpl: CampaignMessageTemplate): string {
  try {
    return renderTemplate(tpl.value, DEMO_CTX);
  } catch {
    return tpl.value;
  }
}

/** Which templates are "user" side (shown as right-aligned outgoing). */
const USER_BUBBLE_KEYS: MessageTemplateKey[] = [];

/** Ordered pairs of (user prompt → bot reply) for the full flow. */
const FLOW_STEPS: Array<{
  userText?: string;
  botKey?: MessageTemplateKey;
  section?: string; // section divider label
}> = [
  { section: "כניסה להגרלה" },
  { userText: "היי, אשמח להצטרף להגרלה" },
  { botKey: "JOIN_WHATSAPP_PROMPT" },
  { userText: "יוסי כהן" },
  { botKey: "WELCOME" },
  { section: "שמירת איש קשר" },
  { botKey: "SAVE_CONTACT_PROMPT" },
  { userText: "שמרתי ✅" },
  { section: "קישור אישי" },
  { botKey: "LINK" },
  { section: "תפריט ראשי" },
  { userText: "תפריט" },
  { botKey: "MAIN_MENU" },
  { section: "סטטוס" },
  { userText: "סטטוס" },
  { botKey: "STATUS_TICKETS" },
  { section: "הפניות" },
  { botKey: "REFERRAL_UPDATE" },
  { section: "זכייה" },
  { botKey: "WINNER" }
];

const variableChips = [
  { token: "{{name}}", label: "שם" },
  { token: "{{tickets}}", label: "כרטיסים" },
  { token: "{{link}}", label: "קישור" },
  { token: "{{referrals}}", label: "הפניות" },
  { token: "{{rank}}", label: "מיקום" },
  { token: "{{top10}}", label: "טופ 10" },
  { token: "{{contact_phone}}", label: "טלפון" },
  { token: "{{campaign_name}}", label: "שם הגרלה" },
  { token: "{{ref}}", label: "קוד מפנה" }
];

/* ── ChatBubble ──────────────────────────────────────────────────── */

function PhoneBubble({
  text,
  isUser,
  isActive,
  isDisabled,
  onClick
}: {
  text: string;
  isUser?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "block max-w-[86%] whitespace-pre-wrap rounded-[18px] px-3 py-2 text-[11px] leading-5 shadow-sm transition-all",
        isUser
          ? "ml-auto rounded-tr-[4px] bg-[#d9fdd3] text-stone-800"
          : "mr-auto rounded-tl-[4px] bg-white text-stone-800",
        onClick && !isUser
          ? "cursor-pointer hover:-translate-y-0.5 hover:ring-2 hover:ring-emerald-300"
          : "cursor-default",
        isActive ? "ring-2 ring-emerald-400 ring-offset-1" : "",
        isDisabled ? "opacity-40 line-through" : ""
      )}
      disabled={!onClick || isUser}
      onClick={onClick}
      type="button"
    >
      {text || <span className="italic text-stone-400">ריק</span>}
    </button>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="h-px flex-1 bg-[#d1cbc3]" />
      <span className="rounded-full bg-[#d1cbc3]/60 px-2.5 py-0.5 text-[9px] font-semibold text-stone-600">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#d1cbc3]" />
    </div>
  );
}

/* ── EditPanel ───────────────────────────────────────────────────── */

function EditPanel({
  template,
  onUpdate,
  onToggle,
  uploadingId,
  onUpload,
  campaignId
}: {
  template: CampaignMessageTemplate | null;
  onUpdate: (id: string, patch: Partial<CampaignMessageTemplate>) => void;
  onToggle: (id: string) => void;
  uploadingId: string | null;
  onUpload: (templateId: string, file: File | null) => Promise<void>;
  campaignId: string;
}) {
  const [aiPrompt, setAiPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(token: string) {
    if (!template) return;
    const el = textareaRef.current;
    if (!el) {
      onUpdate(template.id, { value: template.value + token });
      return;
    }
    const start = el.selectionStart ?? template.value.length;
    const end = el.selectionEnd ?? start;
    const next = template.value.slice(0, start) + token + template.value.slice(end);
    onUpdate(template.id, { value: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-stone-200 p-10 text-center text-stone-400">
        <MessageCircle className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm font-semibold">לחצו על בועה בטלפון כדי לערוך אותה</p>
      </div>
    );
  }

  const validation = validateTemplate(template.value);

  return (
    <div className="space-y-4 rounded-[28px] border border-stone-200 bg-stone-50 p-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-stone-950">{template.label}</p>
          <p className="mt-0.5 text-sm leading-5 text-stone-500">
            {getTemplateDescription(template.key)}
          </p>
        </div>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
            template.isEnabled
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "bg-stone-200 text-stone-600 hover:bg-stone-300"
          )}
          onClick={() => onToggle(template.id)}
          type="button"
        >
          {template.isEnabled ? (
            <><Eye className="h-3.5 w-3.5" /> פעיל</>
          ) : (
            <><EyeOff className="h-3.5 w-3.5" /> כבוי</>
          )}
        </button>
      </div>

      {/* Variable chips */}
      <div className="flex flex-wrap gap-1.5">
        {variableChips.map((chip) => (
          <button
            className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            key={chip.token}
            onClick={() => insertVariable(chip.token)}
            type="button"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <Textarea
        className="min-h-[160px] bg-white text-right text-sm"
        dir="rtl"
        onChange={(e) => onUpdate(template.id, { value: e.target.value })}
        ref={textareaRef}
        value={template.value}
      />

      {!validation.valid ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          משתנים חדשים: {validation.invalidVariables.join(", ")} — ישמרו ויישלחו כמות שהם.
        </p>
      ) : null}

      {/* AI draft */}
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-emerald-800 list-none">
          <Sparkles className="h-4 w-4" />
          עוזר כתיבה חכם
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3">
          <Textarea
            className="min-h-[72px] bg-white text-right text-sm"
            dir="rtl"
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="תאר מה ההודעה אמורה לעשות..."
            value={aiPrompt}
          />
          <Button
            onClick={() => {
              if (!aiPrompt.trim()) return;
              const vars = aiPrompt.match(/\{\{\s*[\w_]+\s*\}\}/g) ?? [];
              const base = `שלום {{name}},\n${aiPrompt.replace(/\{\{[^}]+\}\}/g, "").trim()}${vars.length ? "\n\n" + vars.join(" ") : ""}`;
              onUpdate(template.id, { value: base });
              setAiPrompt("");
            }}
            type="button"
            variant="secondary"
          >
            צור טיוטה
          </Button>
        </div>
      </details>

      {/* Media */}
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4">
        <p className="text-xs font-bold text-stone-700">מדיה</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-stone-950 px-3 text-xs font-black text-white hover:bg-stone-800">
            {uploadingId === template.id ? "מעלה..." : "בחר קובץ"}
            <input
              accept="image/*,video/*"
              className="sr-only"
              disabled={uploadingId === template.id}
              onChange={(e) => void onUpload(template.id, e.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          {template.mediaUrl ? (
            <>
              <a
                className="text-xs font-bold text-emerald-700 underline"
                href={template.mediaUrl}
                rel="noreferrer"
                target="_blank"
              >
                קובץ מצורף
              </a>
              <button
                className="text-xs font-semibold text-stone-400 hover:text-red-500"
                onClick={() => onUpdate(template.id, { mediaUrl: null, mediaType: null })}
                type="button"
              >
                הסר
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── ChatFlowBuilder (main export) ──────────────────────────────── */

export function ChatFlowBuilder({
  campaignId,
  connectionStatus,
  initialTemplates,
  onSave
}: {
  campaignId: string;
  connectionStatus: ConnectionStatus;
  initialTemplates: CampaignMessageTemplate[];
  onSave: (templates: CampaignMessageTemplate[]) => Promise<void>;
}) {
  const [templates, setTemplates] = useState(() =>
    [...initialTemplates].sort((a, b) => {
      const order = TEMPLATE_EDITOR_ORDER;
      return order.indexOf(a.key) - order.indexOf(b.key);
    })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeTemplate = templates.find((t) => t.id === activeId) ?? null;

  function updateTemplate(id: string, patch: Partial<CampaignMessageTemplate>) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function toggleTemplate(id: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isEnabled: !t.isEnabled } : t))
    );
  }

  async function uploadMedia(templateId: string, file: File | null) {
    if (!file) return;
    setUploadingId(templateId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("campaignId", campaignId);
      const res = await fetch("/api/uploads/media", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = (await res.json()) as { url?: string; mediaType?: string };
      if (data.url) {
        updateTemplate(templateId, {
          mediaUrl: data.url,
          mediaType: (data.mediaType ?? "image") as any
        });
      }
    } finally {
      setUploadingId(null);
    }
  }

  function handleSave() {
    startTransition(() => {
      void onSave(templates).then(() => {
        setSavedMsg("נשמר בהצלחה ✓");
        setTimeout(() => setSavedMsg(null), 3000);
      }).catch(() => {
        setSavedMsg("שמירה נכשלה");
        setTimeout(() => setSavedMsg(null), 3000);
      });
    });
  }

  function getTemplateByKey(key: MessageTemplateKey) {
    return templates.find((t) => t.key === key) ?? null;
  }

  const statusDot =
    connectionStatus === "connected"
      ? "bg-emerald-400"
      : connectionStatus === "qr_ready" || connectionStatus === "connecting"
      ? "bg-amber-400"
      : "bg-stone-400";

  return (
    <section className="space-y-4" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-stone-950">בונה השיחה</h2>
          <p className="text-sm text-stone-500">לחץ על בועה כדי לערוך. השינויים מתעדכנים מיד בתצוגה המקדימה.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedMsg ? (
            <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
              {savedMsg}
            </span>
          ) : null}
          <Button disabled={isPending} onClick={handleSave}>
            <Save className="ml-1.5 h-4 w-4" />
            {isPending ? "שומר..." : "שמור הכל"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ── Phone frame ─────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="mx-auto w-[280px] rounded-[40px] border-[10px] border-stone-900 bg-stone-900 shadow-[0_32px_60px_rgba(28,25,23,0.32)]">
            {/* Notch */}
            <div className="flex items-center justify-between rounded-t-[30px] bg-stone-900 px-4 py-2">
              <span className="text-[10px] text-stone-400">09:41</span>
              <div className="h-3 w-16 rounded-full bg-stone-800" />
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <div className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <div className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              </div>
            </div>

            <div className="rounded-b-[30px] bg-[#0a1014] pb-3">
              {/* WhatsApp header bar */}
              <div className="flex items-center gap-2 bg-[#1f2c34] px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                  MF
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-white">Magic Flow</p>
                  <div className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                    <span className="text-[9px] text-stone-400">
                      {connectionStatus === "connected" ? "מחובר" : "ממתין"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat thread */}
              <div
                className="h-[520px] space-y-2 overflow-y-auto bg-[#efeae2] p-3"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e5ddd5'/%3E%3C/svg%3E\")"
                }}
              >
                {FLOW_STEPS.map((step, idx) => {
                  if (step.section) {
                    return <SectionDivider key={`sec-${idx}`} label={step.section} />;
                  }

                  if (step.userText) {
                    return (
                      <PhoneBubble
                        isUser
                        key={`user-${idx}`}
                        text={step.userText}
                      />
                    );
                  }

                  if (step.botKey) {
                    const tpl = getTemplateByKey(step.botKey);
                    if (!tpl) return null;
                    return (
                      <PhoneBubble
                        isActive={activeId === tpl.id}
                        isDisabled={!tpl.isEnabled}
                        key={`bot-${step.botKey}`}
                        onClick={() => setActiveId(tpl.id)}
                        text={safeRender(tpl)}
                      />
                    );
                  }

                  return null;
                })}
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-2 bg-[#1f2c34] px-3 py-2">
                <div className="flex-1 rounded-full bg-[#2a3942] px-3 py-1.5 text-[10px] text-stone-500">
                  כתוב הודעה...
                </div>
                <div className="h-7 w-7 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>

          {/* Template quick-jump list */}
          <div className="mt-4 space-y-1">
            {templates.filter(t => t.isEnabled).map((t) => (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-xs font-semibold transition",
                  activeId === t.id
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-stone-600 hover:bg-stone-100"
                )}
                key={t.id}
                onClick={() => setActiveId(t.id)}
                type="button"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Edit panel ──────────────────────────────────────────── */}
        <EditPanel
          campaignId={campaignId}
          onToggle={toggleTemplate}
          onUpdate={updateTemplate}
          onUpload={uploadMedia}
          template={activeTemplate}
          uploadingId={uploadingId}
        />
      </div>
    </section>
  );
}
