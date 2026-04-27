import {
  DEFAULT_STATUS_COMMANDS,
  type Campaign,
  type DashboardStats,
  type Participant,
  type WhatsAppConnection,
  type WinnerDraw,
  type Workspace
} from "./domain";
import { buildDashboardStats, drawWinner, generateReferralToken } from "./leaderboard";
import { createDefaultTemplates } from "./templates";

export interface DemoStore {
  workspace: Workspace;
  connection: WhatsAppConnection;
  campaign: Campaign;
  participants: Participant[];
  winnerDraws: WinnerDraw[];
  totalMessagesSent: number;
  totalReferralEvents: number;
}

export function createDemoStore(baseUrl: string): DemoStore {
  const workspace: Workspace = {
    id: "workspace_demo",
    name: "Lucky Lemon Bakery",
    slug: "lucky-lemon",
    ownerName: "Lucky Lemon Owner",
    ownerEmail: "owner@luckylemon.test",
    phoneNumber: "+972500000001",
    whatsappStatus: "DISCONNECTED",
    createdAt: "2026-04-25T09:00:00.000Z"
  };

  const connection: WhatsAppConnection = {
    id: "connection_demo",
    workspaceId: workspace.id,
    provider: "unofficial_qr",
    label: "מספר הוואטסאפ הראשי",
    status: "disconnected",
    batteryLevel: null,
    qrCode: null,
    phoneNumber: null,
    sessionKey: "session_demo",
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  const campaign: Campaign = {
    id: "campaign_spring",
    workspaceId: workspace.id,
    connectionId: connection.id,
    name: "הגרלת האביב",
    slug: "spring-lottery",
    mode: "REFERRAL",
    triggerWord: "lottery",
    drawDate: null,
    drawWeightMode: "STORED_TICKETS",
    contactTagName: "Lottery_Campaign_1",
    googleContactGroupResourceName: null,
    statusCommandAliases: [...DEFAULT_STATUS_COMMANDS],
    isActive: true,
    messageCount: 187,
    createdAt: "2026-04-25T09:30:00.000Z",
    templates: createDefaultTemplates("campaign_spring")
  };

  const participantSeeds = [
    ["participant_1", "Shira", "+972501111111", 14, 28, null],
    ["participant_2", "Daniel", "+972502222222", 12, 24, "participant_1"],
    ["participant_3", "Omer", "+972503333333", 9, 18, "participant_1"],
    ["participant_4", "Noa", "+972504444444", 8, 16, "participant_2"],
    ["participant_5", "Lior", "+972505555555", 6, 12, "participant_1"],
    ["participant_6", "Maya", "+972506666666", 5, 10, "participant_4"],
    ["participant_7", "Amit", "+972507777777", 4, 8, "participant_2"],
    ["participant_8", "Gili", "+972508888888", 3, 6, "participant_5"],
    ["participant_9", "Eden", "+972509999999", 2, 4, "participant_6"],
    ["participant_10", "Roi", "+972501234560", 1, 2, "participant_3"]
  ] as const;

  const participants: Participant[] = participantSeeds.map(
    ([id, name, phone, referralsCount, tickets, referredByParticipantId], index) => {
      const referralToken = generateReferralToken();

      return {
        id,
        campaignId: campaign.id,
        name,
        phone,
        chatAddress: null,
        referralsCount,
        tickets,
        referralToken,
        referralLink: `${baseUrl}/join/${campaign.slug}?ref=${referralToken}`,
        joinedAt: new Date(Date.now() - index * 86_400_000).toISOString(),
        referredByParticipantId,
        onboardingState: "REGISTERED",
        contactSavedConfirmed: true,
        pendingReferralCode: null,
        pendingReferrerPhone: null
      };
    }
  );

  return {
    workspace,
    connection,
    campaign,
    participants,
    winnerDraws: [],
    totalMessagesSent: 187,
    totalReferralEvents: participants.reduce(
      (sum, participant) => sum + participant.referralsCount,
      0
    )
  };
}

export function cloneDemoStore(store: DemoStore): DemoStore {
  return structuredClone(store);
}

export function drawWinnerFromStore(store: DemoStore): {
  store: DemoStore;
  winner: WinnerDraw | null;
} {
  const winner = drawWinner(store.campaign.id, store.participants);

  if (!winner) {
    return { store, winner: null };
  }

  return {
    store: {
      ...store,
      winnerDraws: [winner, ...store.winnerDraws],
      totalMessagesSent: store.totalMessagesSent + 1
    },
    winner
  };
}

export function buildStoreDashboardStats(store: DemoStore): DashboardStats {
  return buildDashboardStats(
    store.campaign,
    store.participants,
    store.totalMessagesSent,
    store.winnerDraws,
    store.totalReferralEvents
  );
}
