"use client";

/**
 * CampaignSettingsEditor
 *
 * Lets the user edit live campaign routing settings:
 *   - Trigger word (multi-tenant deep link keyword)
 *   - Email collection toggle
 *   - WhatsApp group invite link
 *
 * Changes are saved via PATCH /api/campaigns/:id/settings and take effect
 * on the very next inbound WhatsApp message — no worker restart needed.
 */

import { useState, useTransition } from "react";
import type { Campaign } from "@lottery/core";
import { cn } from "@lottery/ui";
import { Save, Zap } from "lucide-react";

export function CampaignSettingsEditor({ campaign }: { campaign: Campaign }) {
  const [triggerWord, setTriggerWord] = useState(campaign.triggerWord ?? "");
  const [collectEmail, setCollectEmail] = useState(campaign.collectEmail);
  const [groupInviteLink, setGroupInviteLink] = useState(campaign.groupInviteLink ?? "");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      setError(null);
      setSavedMsg(null);
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerWord: triggerWord.trim() || null,
            collectEmail,
            groupInviteLink: groupInviteLink.trim() || null
          })
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "שגיאה בשמירה");
        }
        setSavedMsg("⚡ נשמר — בתוקף מיידי");
        setTimeout(() => setSavedMsg(null), 4000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה");
      }
    });
  }

  return (
    <div className="space-y-5 rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-cyan-600 uppercase tracking-wide">ניתוב רב-שוכרים</p>
          <h3 className="mt-1 text-xl font-black text-stone-950">הגדרות הגרלה</h3>
          <p className="mt-1 text-sm leading-5 text-stone-500">
            שינויים נכנסים לתוקף <strong>מיידית</strong> — ללא הפעלה מחדש של ה-Worker.
          </p>
        </div>
        <Zap className="mt-1 h-5 w-5 shrink-0 text-amber-400" />
      </div>

      <div className="space-y-4">
        {/* Trigger word */}
        <label className="block">
          <span className="text-sm font-bold text-stone-700">מילת פתיחה (Deep Link Trigger)</span>
          <p className="mt-0.5 text-xs text-stone-400">
            משתמש ששולח מילה זו ב-WhatsApp מצטרף לתהליך ההרשמה.
          </p>
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm font-semibold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50"
            dir="rtl"
            onChange={(e) => setTriggerWord(e.target.value)}
            placeholder="הגרלה"
            type="text"
            value={triggerWord}
          />
        </label>

        {/* Collect email */}
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="relative">
            <input
              checked={collectEmail}
              className="sr-only"
              onChange={(e) => setCollectEmail(e.target.checked)}
              type="checkbox"
            />
            <div
              className={cn(
                "h-6 w-11 rounded-full transition-colors",
                collectEmail ? "bg-emerald-500" : "bg-stone-300"
              )}
            />
            <div
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                collectEmail ? "-translate-x-5" : "translate-x-0.5"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900">איסוף דוא&quot;ל מהמשתתף</p>
            <p className="text-xs text-stone-500">המשתתף יתבקש להזין כתובת מייל בזמן ההרשמה</p>
          </div>
        </label>

        {/* Group invite link */}
        <label className="block">
          <span className="text-sm font-bold text-stone-700">קישור קבוצת WhatsApp (אופציונלי)</span>
          <p className="mt-0.5 text-xs text-stone-400">
            נשלח למשתתף אחרי ההרשמה. השאר ריק כדי לדלג.
          </p>
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50"
            dir="ltr"
            onChange={(e) => setGroupInviteLink(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            type="url"
            value={groupInviteLink}
          />
        </label>
      </div>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={isPending}
          onClick={handleSave}
          type="button"
        >
          <Save className="h-4 w-4" />
          {isPending ? "שומר..." : "שמור"}
        </button>
        {savedMsg ? (
          <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {savedMsg}
          </span>
        ) : null}
        {error ? (
          <span className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
