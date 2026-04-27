"use client";

import type { ReactNode } from "react";
import type {
  CampaignMessageTemplate,
  ConnectionStatus,
  MessageTemplateKey,
  TemplatePreviewContext
} from "@lottery/core/domain";
import { renderTemplate } from "@lottery/core/templates";
import { Badge, Card, CardDescription, CardTitle, cn } from "@lottery/ui";

function statusTone(status: ConnectionStatus) {
  switch (status) {
    case "connected":
      return "success" as const;
    case "qr_ready":
    case "connecting":
      return "warning" as const;
    case "error":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function statusLabel(status: ConnectionStatus): string {
  if (status === "connected") {
    return "מחובר";
  }

  if (status === "qr_ready" || status === "connecting") {
    return "בתהליך חיבור";
  }

  if (status === "error") {
    return "תקלה";
  }

  return "ממתין";
}

function safeRender(
  template: CampaignMessageTemplate | null | undefined,
  previewContext: TemplatePreviewContext
): string {
  if (!template) {
    return "";
  }

  try {
    return renderTemplate(template.value, previewContext);
  } catch {
    return template.value;
  }
}

function ChatBubble({
  children,
  isUser = false,
  active = false,
  onClick
}: {
  children: ReactNode;
  isUser?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "block max-w-[84%] rounded-[22px] px-4 py-3 text-right text-sm leading-6 shadow-sm transition",
        isUser
          ? "mr-auto rounded-tr-md bg-[#dcf8c6] text-stone-800"
          : "ml-auto rounded-tl-md bg-white text-stone-800",
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:ring-2 hover:ring-orange-200" : "",
        active ? "ring-2 ring-orange-300" : ""
      )}
      disabled={!onClick}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function OnboardingSimulator({
  activeTemplate,
  connectionStatus,
  onSelectTemplate,
  previewContext,
  templates
}: {
  activeTemplate: CampaignMessageTemplate | null;
  connectionStatus: ConnectionStatus;
  onSelectTemplate?: (templateKey: MessageTemplateKey) => void;
  previewContext: TemplatePreviewContext;
  templates: CampaignMessageTemplate[];
}) {
  const enabledTemplates = templates.filter((template) => template.isEnabled);
  const welcomeTemplate =
    enabledTemplates.find((template) => template.key === "WELCOME") ??
    (activeTemplate?.isEnabled ? activeTemplate : null);
  const saveContactTemplate = enabledTemplates.find(
    (template) => template.key === "SAVE_CONTACT_PROMPT"
  );
  const successTemplate = enabledTemplates.find((template) => template.key === "LINK");
  const joinPrefillTemplate = enabledTemplates.find(
    (template) => template.key === "JOIN_WHATSAPP_PROMPT"
  );
  const menuTemplate = enabledTemplates.find((template) => template.key === "MAIN_MENU");

  return (
    <Card className="h-fit space-y-5 xl:sticky xl:top-6" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="text-right">
          <CardTitle>סימולטור לחיץ</CardTitle>
          <CardDescription className="mt-2">
            לחיצה על בועה פותחת את ההודעה המתאימה לעריכה. זו הדרך הכי מהירה להבין מה
            הלקוח רואה בפועל.
          </CardDescription>
        </div>
        <Badge tone={statusTone(connectionStatus)}>{statusLabel(connectionStatus)}</Badge>
      </div>

      <div className="mx-auto w-full max-w-[320px] rounded-[38px] border-[10px] border-stone-950 bg-stone-950 p-3 shadow-[0_28px_50px_rgba(28,25,23,0.28)]">
        <div className="rounded-[28px] bg-[#efeae2] p-4">
          <div className="mb-4 flex items-center justify-between rounded-full bg-[#d9d2c7] px-4 py-2 text-xs text-stone-700">
            <span>09:41</span>
            <span>Magic Flow</span>
          </div>

          <div className="space-y-3">
            {joinPrefillTemplate ? (
              <ChatBubble
                active={activeTemplate?.key === "JOIN_WHATSAPP_PROMPT"}
                isUser
                onClick={() => onSelectTemplate?.("JOIN_WHATSAPP_PROMPT")}
              >
                {safeRender(joinPrefillTemplate, previewContext)}
              </ChatBubble>
            ) : (
              <ChatBubble isUser>היי, אשמח להצטרף להגרלה</ChatBubble>
            )}

            <div className="flex justify-end">
              <div className="rounded-full bg-white px-3 py-1 text-sm shadow-sm">❤️</div>
            </div>

            {welcomeTemplate?.mediaUrl ? (
              <button
                className="ml-auto block max-w-[84%] rounded-[24px] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:ring-2 hover:ring-orange-200"
                onClick={() => onSelectTemplate?.("WELCOME")}
                type="button"
              >
                {welcomeTemplate.mediaType === "VIDEO" ? (
                  <div className="rounded-[20px] bg-stone-950 px-4 py-10 text-center text-sm text-white">
                    תצוגת וידאו
                  </div>
                ) : (
                  <img
                    alt={welcomeTemplate.label}
                    className="max-h-44 w-full rounded-[20px] object-cover"
                    src={welcomeTemplate.mediaUrl}
                  />
                )}
              </button>
            ) : null}

            <ChatBubble
              active={activeTemplate?.key === "WELCOME"}
              onClick={() => onSelectTemplate?.("WELCOME")}
            >
              {safeRender(welcomeTemplate, previewContext)}
            </ChatBubble>

            <ChatBubble isUser>{previewContext.name}</ChatBubble>

            <ChatBubble>
              זיהינו אוטומטית מי הזמין את הלקוח מתוך הקישור, בלי לשאול שאלה מיותרת.
            </ChatBubble>

            {saveContactTemplate ? (
              <ChatBubble
                active={activeTemplate?.key === "SAVE_CONTACT_PROMPT"}
                onClick={() => onSelectTemplate?.("SAVE_CONTACT_PROMPT")}
              >
                <div>{safeRender(saveContactTemplate, previewContext)}</div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {(saveContactTemplate.interactive?.options ?? []).map((option) => (
                    <span
                      key={option.id}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                    >
                      {option.label}
                    </span>
                  ))}
                </div>
              </ChatBubble>
            ) : null}

            <ChatBubble isUser>שמרתי</ChatBubble>

            {successTemplate ? (
              <ChatBubble
                active={activeTemplate?.key === "LINK"}
                onClick={() => onSelectTemplate?.("LINK")}
              >
                {safeRender(successTemplate, previewContext)}
              </ChatBubble>
            ) : null}

            {menuTemplate ? (
              <ChatBubble
                active={activeTemplate?.key === "MAIN_MENU"}
                onClick={() => onSelectTemplate?.("MAIN_MENU")}
              >
                <div>{safeRender(menuTemplate, previewContext)}</div>
                <div className="mt-3 space-y-2 rounded-2xl bg-stone-50 p-3">
                  {(menuTemplate.interactive?.options ?? []).map((option) => (
                    <div key={option.id} className="rounded-2xl bg-white px-3 py-2">
                      <p className="font-medium text-stone-900">{option.label}</p>
                      {option.description ? (
                        <p className="mt-1 text-xs text-stone-500">{option.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </ChatBubble>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
