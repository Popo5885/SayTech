"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  TEMPLATE_EDITOR_ORDER,
  buildTemplatePreviewContext,
  getTemplateDescription,
  normalizeInteractiveConfig,
  validateTemplate
} from "@lottery/core/templates";
import type {
  CampaignMessageTemplate,
  ConnectionStatus,
  MediaType,
  MessageTemplateKey,
  TemplateInteractiveConfig
} from "@lottery/core/domain";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Input,
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
  { token: "{{contact_phone}}", label: "טלפון לשמירה" },
  { token: "{{campaign_name}}", label: "שם ההגרלה" },
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
    label: "זרימת הרשמה",
    description: "פתיחה, שמירת איש קשר וקישור אישי.",
    keys: [
      "JOIN_WHATSAPP_PROMPT",
      "WELCOME",
      "SAVE_CONTACT_PROMPT",
      "REGISTRATION_PAUSED",
      "LINK"
    ]
  },
  {
    id: "returning",
    label: "לקוחות חוזרים",
    description: "תפריט, סטטוס אישי וטבלת מובילים.",
    keys: ["MAIN_MENU", "STATUS_TICKETS", "SELF_STATUS", "LEADERBOARD_SUMMARY"]
  },
  {
    id: "automation",
    label: "אוטומציות והתראות",
    description: "זכייה, עדכון מפנה והודעות מערכת.",
    keys: ["WINNER", "REFERRAL_UPDATE", "REFERRER_PROMPT"]
  }
];

type SelectionRange = {
  start: number;
  end: number;
};

function sortTemplates(templates: CampaignMessageTemplate[]): CampaignMessageTemplate[] {
  const order = new Map(TEMPLATE_EDITOR_ORDER.map((key, index) => [key, index]));

  return [...templates].sort(
    (left, right) =>
      (order.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.key) ?? Number.MAX_SAFE_INTEGER)
  );
}

function createDefaultInteractive(kind: TemplateInteractiveConfig["kind"]): TemplateInteractiveConfig {
  if (kind === "BUTTONS") {
    return {
      kind,
      options: [
        { id: "option_1", label: "אפשרות 1" },
        { id: "option_2", label: "אפשרות 2" }
      ]
    };
  }

  if (kind === "LIST") {
    return {
      kind,
      title: "תפריט",
      buttonText: "פתח תפריט",
      footer: null,
      options: [
        { id: "option_1", label: "אפשרות 1", description: "תיאור קצר" },
        { id: "option_2", label: "אפשרות 2", description: "תיאור קצר" }
      ]
    };
  }

  return {
    kind: "NONE",
    options: []
  };
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
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isPending, startSaveTransition] = useTransition();
  const [isUploadingTemplateId, setIsUploadingTemplateId] = useState<string | null>(null);
  const [selectionByTemplate, setSelectionByTemplate] = useState<Record<string, SelectionRange>>({});
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleTemplates = useMemo(
    () => templates.filter((template) => TEMPLATE_EDITOR_ORDER.includes(template.key)),
    [templates]
  );
  const activeGroup = editorGroups.find((group) => group.id === activeGroupId) ?? editorGroups[0];
  const groupTemplates = visibleTemplates.filter((template) => activeGroup.keys.includes(template.key));

  useEffect(() => {
    if (groupTemplates.length === 0) {
      return;
    }

    if (!groupTemplates.some((template) => template.id === activeTemplateId)) {
      setActiveTemplateId(groupTemplates[0].id);
    }
  }, [activeTemplateId, groupTemplates]);

  const previewContext = useMemo(
    () =>
      buildTemplatePreviewContext({
        name: "יעל",
        tickets: 8,
        referrals: 5,
        rank: 3,
        contact_phone: "+972542466340",
        campaign_name: "הגרלת האביב",
        ref: "8DMD6CN8"
      }),
    []
  );

  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ?? groupTemplates[0] ?? null;
  const activeValidation = activeTemplate
    ? validateTemplate(activeTemplate.value)
    : { valid: true, invalidVariables: [] as string[] };

  function updateTemplatesState(
    updater: (current: CampaignMessageTemplate[]) => CampaignMessageTemplate[]
  ): void {
    setTemplates((current) => sortTemplates(updater(current)));
    setSavedMessage(null);
  }

  function updateTemplateValue(id: string, value: string): void {
    updateTemplatesState((current) =>
      current.map((template) => (template.id === id ? { ...template, value } : template))
    );
  }

  function updateTemplateMedia(
    id: string,
    mediaUrl: string | null,
    mediaType: MediaType | null
  ): void {
    updateTemplatesState((current) =>
      current.map((template) =>
        template.id === id ? { ...template, mediaUrl, mediaType } : template
      )
    );
  }

  function updateTemplateInteractive(
    id: string,
    interactive: TemplateInteractiveConfig | null
  ): void {
    updateTemplatesState((current) =>
      current.map((template) =>
        template.id === id
          ? { ...template, interactive: normalizeInteractiveConfig(interactive) }
          : template
      )
    );
  }

  function updateTemplateEnabled(id: string, isEnabled: boolean): void {
    updateTemplatesState((current) =>
      current.map((template) => (template.id === id ? { ...template, isEnabled } : template))
    );
  }

  function updateInteractiveField(
    templateId: string,
    field: "title" | "footer" | "buttonText",
    value: string
  ): void {
    const template = templates.find((item) => item.id === templateId);
    const interactive = template?.interactive;

    if (!interactive) {
      return;
    }

    updateTemplateInteractive(templateId, {
      ...interactive,
      [field]: value
    });
  }

  function updateInteractiveOption(
    templateId: string,
    optionIndex: number,
    field: "label" | "description",
    value: string
  ): void {
    const template = templates.find((item) => item.id === templateId);
    const interactive = template?.interactive;

    if (!interactive) {
      return;
    }

    updateTemplateInteractive(templateId, {
      ...interactive,
      options: interactive.options.map((option, index) =>
        index === optionIndex ? { ...option, [field]: value } : option
      )
    });
  }

  function rememberSelection(id: string): void {
    const textarea = textareaRefs.current[id];

    if (!textarea) {
      return;
    }

    setSelectionByTemplate((current) => ({
      ...current,
      [id]: {
        start: textarea.selectionStart ?? textarea.value.length,
        end: textarea.selectionEnd ?? textarea.value.length
      }
    }));
  }

  function insertVariable(token: string): void {
    if (!activeTemplate) {
      return;
    }

    const textarea = textareaRefs.current[activeTemplate.id];
    const selection = selectionByTemplate[activeTemplate.id] ?? {
      start: textarea?.selectionStart ?? activeTemplate.value.length,
      end: textarea?.selectionEnd ?? activeTemplate.value.length
    };
    const nextValue =
      activeTemplate.value.slice(0, selection.start) +
      token +
      activeTemplate.value.slice(selection.end);
    const nextCursor = selection.start + token.length;

    updateTemplateValue(activeTemplate.id, nextValue);
    setSelectionByTemplate((current) => ({
      ...current,
      [activeTemplate.id]: {
        start: nextCursor,
        end: nextCursor
      }
    }));

    requestAnimationFrame(() => {
      const currentTextarea = textareaRefs.current[activeTemplate.id];
      currentTextarea?.focus();
      currentTextarea?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function selectTemplate(template: CampaignMessageTemplate): void {
    setActiveGroupId(groupForTemplate(template.key).id);
    setActiveTemplateId(template.id);
  }

  async function uploadMedia(file: File): Promise<void> {
    if (!uploadTargetId) {
      return;
    }

    setIsUploadingTemplateId(uploadTargetId);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/uploads/media", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "העלאת המדיה נכשלה.");
      }

      const data = (await response.json()) as { url: string; mediaType: MediaType };
      updateTemplateMedia(uploadTargetId, data.url, data.mediaType);
      setUploadMessage("המדיה עלתה בהצלחה.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "העלאת המדיה נכשלה.");
    } finally {
      setIsUploadingTemplateId(null);
      setUploadTargetId(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          אין עדיין תבניות הודעה במסד הנתונים. לאחר יצירת קמפיין, ההודעות יופיעו כאן לעריכה.
        </CardDescription>
      </Card>
    );
  }

  return (
    <section className="space-y-6" dir="rtl">
      <Card className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-right">
            <CardTitle>עורך Magic Flow</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              כל הודעה נמצאת במקום ברור: בוחרים אזור, פותחים הודעה אחת, עורכים ושומרים.
              הסימולטור משמאל לחיץ, כך שאפשר ללחוץ על בועה ולערוך אותה מיד.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {savedMessage ? (
              <Badge tone={savedMessage.includes("נכשל") ? "danger" : "success"}>
                {savedMessage}
              </Badge>
            ) : null}
            {uploadMessage ? (
              <Badge tone={uploadMessage.includes("בהצלחה") ? "success" : "warning"}>
                {uploadMessage}
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
                key={group.id}
                className={cn(
                  "rounded-[24px] border p-4 text-right transition",
                  selected
                    ? "border-orange-300 bg-orange-50 shadow-sm"
                    : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white"
                )}
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

        <input
          ref={fileInputRef}
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void uploadMedia(file);
            }
          }}
          type="file"
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_370px]">
          <div className="space-y-4">
            {groupTemplates.map((template) => {
              const validation = validateTemplate(template.value);
              const expanded = template.id === activeTemplate?.id;

              return (
                <div
                  key={template.id}
                  className={cn(
                    "overflow-hidden rounded-[28px] border transition",
                    expanded ? "border-orange-300 bg-white shadow-sm" : "border-stone-200 bg-white",
                    template.isEnabled ? "" : "opacity-70"
                  )}
                >
                  <button
                    className="flex w-full items-center justify-between gap-4 p-5 text-right"
                    onClick={() => selectTemplate(template)}
                    type="button"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{template.label}</CardTitle>
                        <Badge tone={template.isEnabled ? "success" : "neutral"}>
                          {template.isEnabled ? "פעיל" : "כבוי"}
                        </Badge>
                        <Badge tone={validation.valid ? "success" : "danger"}>
                          {validation.valid ? "תקין" : "משתנה לא מוכר"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-2">
                        {getTemplateDescription(template.key)}
                      </CardDescription>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                      {expanded ? "פתוח" : "עריכה"}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="space-y-5 border-t border-stone-100 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-stone-200 bg-stone-50 p-3">
                        <div className="text-right text-sm text-stone-600">
                          לחיצה על משתנה מכניסה אותו במקום הסמן בתוך ההודעה.
                        </div>
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded-2xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                            {`{+} הוסף משתנה`}
                          </summary>
                          <div className="absolute left-0 z-20 mt-2 grid w-72 gap-2 rounded-[20px] border border-stone-200 bg-white p-3 shadow-xl">
                            {variableChips.map((chip) => (
                              <button
                                key={chip.token}
                                className="flex items-center justify-between rounded-2xl px-3 py-2 text-right text-sm transition hover:bg-orange-50"
                                onClick={() => insertVariable(chip.token)}
                                type="button"
                              >
                                <span className="font-medium text-stone-800">{chip.label}</span>
                                <code className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                                  {chip.token}
                                </code>
                              </button>
                            ))}
                          </div>
                        </details>
                      </div>

                      <label className="block space-y-2 text-right">
                        <span className="text-sm font-medium text-stone-700">תוכן ההודעה</span>
                        <Textarea
                          ref={(node) => {
                            textareaRefs.current[template.id] = node;
                          }}
                          className="min-h-[190px] bg-white text-right"
                          dir="rtl"
                          onChange={(event) => updateTemplateValue(template.id, event.target.value)}
                          onClick={() => rememberSelection(template.id)}
                          onFocus={() => {
                            setActiveTemplateId(template.id);
                            rememberSelection(template.id);
                          }}
                          onKeyUp={() => rememberSelection(template.id)}
                          onSelect={() => rememberSelection(template.id)}
                          value={template.value}
                        />
                      </label>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={() => updateTemplateEnabled(template.id, !template.isEnabled)}
                          type="button"
                          variant={template.isEnabled ? "ghost" : "secondary"}
                        >
                          {template.isEnabled ? "כבה הודעה" : "הפעל הודעה"}
                        </Button>
                        <Button
                          disabled={isUploadingTemplateId === template.id}
                          onClick={() => {
                            setActiveTemplateId(template.id);
                            setUploadTargetId(template.id);
                            fileInputRef.current?.click();
                          }}
                          type="button"
                          variant="secondary"
                        >
                          {isUploadingTemplateId === template.id ? "מעלה..." : "העלה תמונה או וידאו"}
                        </Button>
                        {template.mediaUrl ? (
                          <Button
                            onClick={() => updateTemplateMedia(template.id, null, null)}
                            type="button"
                            variant="ghost"
                          >
                            הסר מדיה
                          </Button>
                        ) : null}
                        {!template.interactive ? (
                          <>
                            <Button
                              onClick={() =>
                                updateTemplateInteractive(template.id, createDefaultInteractive("BUTTONS"))
                              }
                              type="button"
                              variant="secondary"
                            >
                              הוסף כפתורים
                            </Button>
                            <Button
                              onClick={() =>
                                updateTemplateInteractive(template.id, createDefaultInteractive("LIST"))
                              }
                              type="button"
                              variant="secondary"
                            >
                              הוסף תפריט
                            </Button>
                          </>
                        ) : null}
                      </div>

                      {!template.isEnabled ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-right text-sm text-stone-600">
                          ההודעה כבויה ולא תישלח ללקוחות עד שתפעילו אותה מחדש.
                        </div>
                      ) : null}

                      {template.mediaUrl ? (
                        <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">מדיה</p>
                          {template.mediaType === "VIDEO" ? (
                            <video
                              className="mt-3 max-h-64 w-full rounded-2xl bg-stone-950 object-cover"
                              controls
                              src={template.mediaUrl}
                            />
                          ) : (
                            <img
                              alt={template.label}
                              className="mt-3 max-h-64 w-full rounded-2xl object-cover"
                              src={template.mediaUrl}
                            />
                          )}
                        </div>
                      ) : null}

                      {template.interactive ? (
                        <div className="space-y-4 rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-stone-800">
                              {template.interactive.kind === "BUTTONS" ? "כפתורי בחירה" : "תפריט בחירה"}
                            </p>
                            <Button
                              onClick={() => updateTemplateInteractive(template.id, null)}
                              type="button"
                              variant="ghost"
                            >
                              הסר אינטראקציה
                            </Button>
                          </div>

                          {template.interactive.kind === "LIST" ? (
                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="space-y-2 text-sm font-medium text-stone-700">
                                כותרת
                                <Input
                                  onChange={(event) =>
                                    updateInteractiveField(template.id, "title", event.target.value)
                                  }
                                  value={template.interactive.title ?? ""}
                                />
                              </label>
                              <label className="space-y-2 text-sm font-medium text-stone-700">
                                טקסט כפתור
                                <Input
                                  onChange={(event) =>
                                    updateInteractiveField(template.id, "buttonText", event.target.value)
                                  }
                                  value={template.interactive.buttonText ?? ""}
                                />
                              </label>
                              <label className="space-y-2 text-sm font-medium text-stone-700">
                                טקסט תחתון
                                <Input
                                  onChange={(event) =>
                                    updateInteractiveField(template.id, "footer", event.target.value)
                                  }
                                  value={template.interactive.footer ?? ""}
                                />
                              </label>
                            </div>
                          ) : null}

                          <div className="space-y-3">
                            {template.interactive.options.map((option, index) => (
                              <div
                                key={option.id}
                                className="grid gap-3 rounded-[20px] border border-stone-200 bg-white p-4 md:grid-cols-2"
                              >
                                <label className="space-y-2 text-sm font-medium text-stone-700">
                                  שם אפשרות
                                  <Input
                                    onChange={(event) =>
                                      updateInteractiveOption(template.id, index, "label", event.target.value)
                                    }
                                    value={option.label}
                                  />
                                </label>
                                {template.interactive?.kind === "LIST" ? (
                                  <label className="space-y-2 text-sm font-medium text-stone-700">
                                    תיאור קצר
                                    <Input
                                      onChange={(event) =>
                                        updateInteractiveOption(
                                          template.id,
                                          index,
                                          "description",
                                          event.target.value
                                        )
                                      }
                                      value={option.description ?? ""}
                                    />
                                  </label>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {!validation.valid ? (
                        <p className="text-right text-sm text-red-600">
                          משתנים לא מוכרים: {validation.invalidVariables.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {activeTemplate && !activeValidation.valid ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-right text-sm text-red-700">
                יש משתנה לא מוכר בהודעה הפתוחה. השתמשו רק במשתנים מתוך כפתור {`{+}`}.
              </div>
            ) : null}
          </div>

          <OnboardingSimulator
            activeTemplate={activeTemplate}
            connectionStatus={connectionStatus}
            onSelectTemplate={(templateKey) => {
              const template = visibleTemplates.find((item) => item.key === templateKey);

              if (template) {
                selectTemplate(template);
              }
            }}
            previewContext={previewContext}
            templates={templates}
          />
        </div>
      </Card>
    </section>
  );
}
