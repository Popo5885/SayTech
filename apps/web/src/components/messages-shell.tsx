"use client";

/**
 * MessagesShell
 * Tabs between the classic MessageEditor and the new ChatFlowBuilder.
 * Shares a single save callback so both modes operate on the same template array.
 */

import { useState } from "react";
import type { CampaignMessageTemplate, ConnectionStatus } from "@lottery/core/domain";
import { cn } from "@lottery/ui";
import { MessageSquare, Smartphone } from "lucide-react";
import { MessageEditor } from "./message-editor";
import { ChatFlowBuilder } from "./chat-flow-builder";

type Tab = "classic" | "chat";

async function saveTemplates(
  campaignId: string,
  templates: CampaignMessageTemplate[]
): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/templates`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templates })
  });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "שמירה נכשלה");
  }
}

export function MessagesShell({
  campaignId,
  connectionStatus,
  initialTemplates
}: {
  campaignId: string;
  connectionStatus: ConnectionStatus;
  initialTemplates: CampaignMessageTemplate[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("classic");

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; description: string }> = [
    {
      id: "classic",
      label: "עורך קלאסי",
      icon: <MessageSquare className="h-4 w-4" />,
      description: "ניהול תבניות לפי קבוצות"
    },
    {
      id: "chat",
      label: "בונה שיחה",
      icon: <Smartphone className="h-4 w-4" />,
      description: "עריכה חזותית בסגנון WhatsApp"
    }
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Tab switcher */}
      <div className="flex gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-1.5">
        {tabs.map((tab) => (
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              activeTab === tab.id
                ? "bg-white text-stone-950 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className="hidden text-xs font-normal text-stone-400 md:inline">
              — {tab.description}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "classic" ? (
        <MessageEditor
          campaignId={campaignId}
          connectionStatus={connectionStatus}
          initialTemplates={initialTemplates}
        />
      ) : (
        <ChatFlowBuilder
          campaignId={campaignId}
          connectionStatus={connectionStatus}
          initialTemplates={initialTemplates}
          onSave={(templates) => saveTemplates(campaignId, templates)}
        />
      )}
    </div>
  );
}
