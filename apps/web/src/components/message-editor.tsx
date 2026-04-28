"use client";

import { useMemo, useState, useTransition } from "react";
import {
  TEMPLATE_EDITOR_ORDER,
  buildTemplatePreviewContext,
  getTemplateDescription,
  validateTemplate
} from "@lottery/core/templates";
import type {
  CampaignMessageTemplate,
  ConnectionStatus,
  MediaType,
  MessageTemplateKey
} from "@lottery/core/domain";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Textarea,
  cn
} from "@lottery/ui";
import { OnboardingSimulator } from "./onboarding-simulator";

const variableChips = [
  { token: "{{name}}", label: "שם משתתף" },
  { token: "{{tickets}}", label: "כרטיסים" },
  { token: "{{link}}", label: "קישור אישי" },
  { token: "{{referrals}}", label: "הפניות" },
  { token: "{{rank}}", label: "מיקום" },
  { token: "{{top10}}", label: "מובילים" },
  { token: "{{contact_phone}}", label: "טלפון" },
  { token: "{{campaign_name}}", label: "שם הגרלה" },
  { token: "{{ref}}", label: "קוד מפנה" }
];

const editorGroups: Array<{
  id: "onboarding" | "returning" | "automation";
  label: string;
  description: string;
  keys: MessageTemplateKey[];
}> = [
  {
    id: "onboarding",
    label: "הרשמה",
    description: "פתיחה, שמירת איש קשר וקישור אישי.",
    keys: ["JOIN_WHATSAPP_PROMPT", "WELCOME", "SAVE_CONTACT_PROMPT", "REGISTRATION_PAUSED", "LINK"]
  },
  {
    id: "returning",
    label: "משתתף חוזר",
    description: "תפריט, סטטוס וכרטיסים.",
    keys: ["MAIN_MENU", "STATUS_TICKETS", "SELF_STATUS", "LEADERBOARD_SUMMARY"]
  },
  {
    id: "automation",
    label: "אוטומציות",
    description: "זכייה, עדכון מפנה והודעות מערכת.",
    keys: ["WINNER", "REFERRAL_UPDATE", "REFERRER_PROMPT"]
  }
];

function sortTemplates(templates: CampaignMessageTemplate[]): CampaignMessageTemplate[] {
  const order = new Map(TEMPLATE_EDITOR_ORDER.map((key, index) => [key, index]));

  return [...templates].sort(
    (left, right) =>
      (order.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.key) ?? Number.MAX_SAFE_INTEGER)
  );
}

function groupForTemplate(key: MessageTemplateKey) {
  return editorGroups.find((group) => group.keys.includes(key)) ?? editorGroups[0];
}

export function MessageEditor({
  campaignId,
  initialTemplates,
  connectionStatus = "connected"
}: {
  campaignId: string;
  initialTemplates: CampaignMessageTemplate[];
  connectionStatus?: ConnectionStatus;
}) {
  const [templates, setTemplates] = useState(() => sortTemplates(initialTemplates));
  const [activeGroupId, setActiveGroupId] = useState<(typeof editorGroups)[number]["id"]>(
    groupForTemplate(initialTemplates[0]?.key ?? "WELCOME").id
  );
  const [activeTemplateId, setActiveTemplateId] = useState(initialTemplates[0]?.id ?? "");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const [isPending, startSaveTransition] = useTransition();

  const visibleTemplates = useMemo(
    () => templates.filter((template) => TEMPLATE_EDITOR_ORDER.includes(template.key)),
    [templates]
  );
  const activeGroup = editorGroups.find((group) => group.id === activeGroupId) ?? editorGroups[0];
  const groupTemplates = visibleTemplates.filter((template) => activeGroup.keys.includes(template.key));
  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ?? groupTemplates[0] ?? null;
  const activeValidation = activeTemplate
    ? validateTemplate(activeTemplate.value)
    : { valid: true, invalidVariables: [] as string[] };
  const previewContext = useMemo(
    () =>
      buildTemplatePreviewContext({
        name: "שם המשתתף",
        tickets: 0,
        referrals: 0,
        rank: 0,
        contact_phone: "+972542466340",
        campaign_name: "שם ההגרלה שלך",
        ref: "AB12CD34"
      }),
    []
  );

  function updateTemplate(id: string, updates: Partial<CampaignMessageTemplate>): void {
    setTemplates((current) =>
      sortTemplates(current.map((template) => (template.id === id ? { ...template, ...updates } : template)))
    );
    setSavedMessage(null);
  }

  function selectTemplate(template: CampaignMessageTemplate): void {
    setActiveGroupId(groupForTemplate(template.key).id);
    setActiveTemplateId(template.id);
  }

  function insertVariable(token: string): void {
    if (!activeTemplate) {
      return;
    }

    updateTemplate(activeTemplate.id, {
      value: `${activeTemplate.value}${activeTemplate.value.endsWith(" ") ? "" : " "}${token}`
    });
  }

  function updateMediaType(templateId: string, mediaType: string): void {
    updateTemplate(templateId, {
      mediaType: mediaType ? (mediaType as MediaType) : null
    });
  }

  async function uploadMedia(templateId: string, file: File | null): Promise<void> {
    if (!file) {
      return;
    }

    setUploadingTemplateId(templateId);
    setSavedMessage(null);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/uploads/media", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as {
        error?: string;
        mediaType?: MediaType;
        url?: string;
      };

      if (!response.ok || !data.url || !data.mediaType) {
        setSavedMessage(data.error ?? "העלאת המדיה נכשלה.");
        return;
      }

      updateTemplate(templateId, {
        mediaUrl: data.url,
        mediaType: data.mediaType
      });
      setSavedMessage("המדיה הועלתה. חשוב לשמור שינויים.");
    } finally {
      setUploadingTemplateId(null);
    }
  }

  async function saveTemplates(): Promise<void> {
    const response = await fetch(`/api/campaigns/${campaignId}/templates`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        templates: templates.map((template) => ({
          key: template.key,
          value: template.value,
          isEnabled: template.isEnabled,
          mediaUrl: template.mediaUrl,
          mediaType: template.mediaType,
          interactive: template.interactive
        }))
      })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setSavedMessage(data.error ?? "השמירה נכשלה. נסו שוב.");
      return;
    }

    const data = (await response.json()) as {
      templates: CampaignMessageTemplate[];
      savedAt: string;
    };

    startSaveTransition(() => {
      setTemplates(sortTemplates(data.templates));
      setSavedMessage(`נשמר ב-${new Date(data.savedAt).toLocaleTimeString("he-IL")}`);
    });
  }

  if (visibleTemplates.length === 0) {
    return (
      <Card dir="rtl">
        <CardTitle>עורך הודעות</CardTitle>
        <CardDescription className="mt-2">
          עדיין אין תבניות הודעה. אחרי יצירת הגרלה, ההודעות יופיעו כאן לעריכה.
        </CardDescription>
      </Card>
    );
  }

  return (
    <section className="space-y-6" dir="rtl">
      <Card className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-right">
            <CardTitle>הודעות</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              בוחרים שלב, עורכים הודעה ושומרים. בלי מסכים עמוסים ובלי מונחים טכניים.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {savedMessage ? (
              <Badge tone={savedMessage.includes("נכשלה") ? "danger" : "success"}>
                {savedMessage}
              </Badge>
            ) : null}
            <Button disabled={isPending} onClick={() => void saveTemplates()}>
              {isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {editorGroups.map((group) => {
            const selected = group.id === activeGroupId;
            const count = visibleTemplates.filter((template) => group.keys.includes(template.key)).length;

            return (
              <button
                className={cn(
                  "rounded-[24px] border p-4 text-right transition",
                  selected
                    ? "border-emerald-300 bg-emerald-50 shadow-sm"
                    : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white"
                )}
                key={group.id}
                onClick={() => {
                  setActiveGroupId(group.id);
                  const firstTemplate = visibleTemplates.find((template) =>
                    group.keys.includes(template.key)
                  );

                  if (firstTemplate) {
                    setActiveTemplateId(firstTemplate.id);
                  }
                }}
                type="button"
              >
                <span className="block text-sm font-semibold text-stone-950">{group.label}</span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">{group.description}</span>
                <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-600">
                  {count} הודעות
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_370px]">
        <Card className="space-y-5">
          <div className="space-y-3">
            {groupTemplates.map((template) => {
              const selected = template.id === activeTemplate?.id;
              const validation = validateTemplate(template.value);

              return (
                <button
                  className={cn(
                    "w-full rounded-[22px] border p-4 text-right transition",
                    selected
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  )}
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-stone-950">{template.label}</span>
                    <Badge tone={template.isEnabled ? "success" : "neutral"}>
                      {template.isEnabled ? "פעיל" : "כבוי"}
                    </Badge>
                    <Badge tone={validation.valid ? "success" : "danger"}>
                      {validation.valid ? "תקין" : "משתנה לא מוכר"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    {getTemplateDescription(template.key)}
                  </p>
                </button>
              );
            })}
          </div>

          {activeTemplate ? (
            <div className="space-y-5 rounded-[28px] border border-stone-200 bg-stone-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{activeTemplate.label}</CardTitle>
                  <CardDescription className="mt-1">
                    {getTemplateDescription(activeTemplate.key)}
                  </CardDescription>
                </div>
                <Button
                  onClick={() =>
                    updateTemplate(activeTemplate.id, { isEnabled: !activeTemplate.isEnabled })
                  }
                  type="button"
                  variant={activeTemplate.isEnabled ? "ghost" : "secondary"}
                >
                  {activeTemplate.isEnabled ? "כבה הודעה" : "הפעל הודעה"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2" data-tour="smart-variable">
                {variableChips.map((chip) => (
                  <button
                    className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                    key={chip.token}
                    onClick={() => insertVariable(chip.token)}
                    type="button"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <Textarea
                className="min-h-[220px] bg-white text-right"
                dir="rtl"
                onChange={(event) => updateTemplate(activeTemplate.id, { value: event.target.value })}
                value={activeTemplate.value}
              />

              {!activeValidation.valid ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  נמצאו משתנים לא מוכרים: {activeValidation.invalidVariables.join(", ")}
                </div>
              ) : null}

              <div className="rounded-3xl border border-stone-200 bg-white p-4" data-tour="status-task">
                <p className="text-sm font-black text-stone-900">מדיה להודעה</p>
                <p className="mt-1 text-sm leading-6 text-stone-500">
                  מעלים תמונה או וידאו מהמחשב או מהטלפון. אין צורך להדביק קישור.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="inline-flex h-11 cursor-pointer items-center rounded-2xl bg-stone-950 px-4 text-sm font-black text-white transition hover:bg-stone-800">
                    {uploadingTemplateId === activeTemplate.id ? "מעלה..." : "בחירת קובץ"}
                    <input
                      accept="image/*,video/*"
                      className="sr-only"
                      disabled={uploadingTemplateId === activeTemplate.id}
                      onChange={(event) => {
                        void uploadMedia(activeTemplate.id, event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />
                  </label>

                  {activeTemplate.mediaUrl ? (
                    <>
                      <a
                        className="text-sm font-bold text-emerald-700"
                        dir="ltr"
                        href={activeTemplate.mediaUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        קובץ הועלה
                      </a>
                      <button
                        className="h-10 rounded-2xl border border-stone-200 px-4 text-sm font-bold text-stone-600"
                        onClick={() =>
                          updateTemplate(activeTemplate.id, {
                            mediaUrl: null,
                            mediaType: null
                          })
                        }
                        type="button"
                      >
                        הסרת מדיה
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <OnboardingSimulator
          activeTemplate={activeTemplate}
          connectionStatus={connectionStatus}
          onSelectTemplate={(templateKey) => {
            const template = templates.find((item) => item.key === templateKey);

            if (template) {
              selectTemplate(template);
            }
          }}
          previewContext={previewContext}
          templates={templates}
        />
      </div>
    </section>
  );
}
