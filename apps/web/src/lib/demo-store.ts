import net from "node:net";
import {
  CampaignRepository,
  ContactSyncLedgerRepository,
  ParticipantRepository,
  WhatsAppConnectionRepository,
  WorkspaceRepository,
  bootstrapDevelopmentData,
  type CampaignLiveState,
  type CampaignMessageTemplate,
  type CampaignSettingsUpdate,
  type CampaignTemplateUpdateInput,
  type ConnectionSnapshot,
  type DashboardStats,
  type ParticipantStatusSnapshot
} from "@lottery/core";

const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

const workspaceRepository = new WorkspaceRepository();
const connectionRepository = new WhatsAppConnectionRepository();
const campaignRepository = new CampaignRepository(baseUrl);
const participantRepository = new ParticipantRepository(baseUrl);
const contactSyncLedgerRepository = new ContactSyncLedgerRepository();

function resolveSocketHealthUrl(): string | null {
  const rawUrl =
    process.env.SOCKET_IO_URL ?? process.env.NEXT_PUBLIC_SOCKET_IO_URL ?? "http://localhost:3333";

  return rawUrl.replace(/^ws/i, "http").replace(/\/$/, "");
}

async function isWorkerOnline(): Promise<boolean> {
  const socketUrl = resolveSocketHealthUrl();

  if (!socketUrl) {
    return false;
  }

  try {
    const url = new URL(socketUrl);
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));

    await new Promise<void>((resolve, reject) => {
      const socket = net.connect(
        {
          host: url.hostname,
          port
        },
        () => {
          socket.end();
          resolve();
        }
      );

      socket.setTimeout(1500, () => {
        socket.destroy();
        reject(new Error("Socket timeout"));
      });

      socket.once("error", (error) => {
        socket.destroy();
        reject(error);
      });

      socket.once("close", (hadError) => {
        if (hadError) {
          reject(new Error("Socket closed before connection was established"));
        }
      });
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureDatabase(): Promise<void> {
  if (process.env.ENABLE_DEVELOPMENT_SEED === "true") {
    await bootstrapDevelopmentData(baseUrl);
  }
}

export async function getPrimaryStore() {
  await ensureDatabase();

  const workspace = await workspaceRepository.getPrimaryWorkspace();
  const connection = await connectionRepository.getPrimaryConnection();
  const campaign = await campaignRepository.getPrimaryCampaign();

  if (!workspace || !connection || !campaign) {
    return null;
  }

  const participants = await participantRepository.listByCampaign(campaign.id);

  return {
    workspace,
    connection,
    campaign,
    participants
  };
}

export async function getDemoStore() {
  const store = await getPrimaryStore();

  if (!store) {
    throw new Error("Unable to load workspace, campaign, or connection from the database.");
  }

  return store;
}

export async function getConnectionSnapshot(connectionId: string): Promise<ConnectionSnapshot> {
  await ensureDatabase();
  const connection = await connectionRepository.findById(connectionId);
  const workerOnline = await isWorkerOnline();

  if (!connection) {
    throw new Error("Connection not found.");
  }

  return {
    connectionId: connection.id,
    status: connection.status,
    provider: connection.provider,
    batteryLevel: workerOnline ? connection.batteryLevel : null,
    qrCode: workerOnline ? connection.qrCode : null,
    phoneNumber: connection.phoneNumber,
    sessionKey: connection.sessionKey,
    lastError: connection.lastError,
    updatedAt: connection.updatedAt,
    workerOnline
  };
}

export async function launchOrReconnectConnection(
  connectionId: string
): Promise<ConnectionSnapshot> {
  await ensureDatabase();
  const connection = await connectionRepository.markConnected(connectionId);

  return {
    connectionId: connection.id,
    status: connection.status,
    provider: connection.provider,
    batteryLevel: connection.batteryLevel,
    qrCode: connection.qrCode,
    phoneNumber: connection.phoneNumber,
    sessionKey: connection.sessionKey,
    lastError: connection.lastError,
    updatedAt: connection.updatedAt
  };
}

export async function resetConnectionToQr(connectionId: string): Promise<ConnectionSnapshot> {
  await ensureDatabase();
  const connection = await connectionRepository.regenerateQr(connectionId);

  return {
    connectionId: connection.id,
    status: connection.status,
    provider: connection.provider,
    batteryLevel: connection.batteryLevel,
    qrCode: connection.qrCode,
    phoneNumber: connection.phoneNumber,
    sessionKey: connection.sessionKey,
    lastError: connection.lastError,
    updatedAt: connection.updatedAt
  };
}

export async function getTemplates(campaignId: string): Promise<CampaignMessageTemplate[]> {
  await ensureDatabase();
  return campaignRepository.getTemplates(campaignId);
}

export async function updateTemplates(
  campaignId: string,
  updates: CampaignTemplateUpdateInput[]
): Promise<CampaignMessageTemplate[]> {
  await ensureDatabase();
  return campaignRepository.updateTemplates(campaignId, updates);
}

export async function updateCampaignSettings(
  campaignId: string,
  updates: CampaignSettingsUpdate
) {
  await ensureDatabase();
  return campaignRepository.updateSettings(campaignId, updates);
}

export async function getDashboardStats(campaignId: string): Promise<DashboardStats> {
  await ensureDatabase();
  return campaignRepository.getDashboardStats(campaignId);
}

export async function getCampaignLiveState(campaignId: string): Promise<CampaignLiveState> {
  await ensureDatabase();
  return campaignRepository.getLiveState(campaignId);
}

export async function runWinnerDraw(campaignId: string) {
  await ensureDatabase();
  const winner = await campaignRepository.drawWeightedWinner(campaignId);

  return {
    winner,
    liveState: await campaignRepository.getLiveState(campaignId),
    stats: await campaignRepository.getDashboardStats(campaignId),
    winnerMessage:
      winner ? await campaignRepository.buildWinnerMessage(campaignId, winner) : null
  };
}

export async function getPublicCampaign(slug: string) {
  await ensureDatabase();
  const campaign = await campaignRepository.findBySlug(slug);

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const [connection, workspace] = await Promise.all([
    connectionRepository.findById(campaign.connectionId),
    workspaceRepository.getPrimaryWorkspace()
  ]);
  const leaderboard = await participantRepository.getLeaderboard(campaign.id);

  return {
    campaign,
    whatsappPhone: connection?.phoneNumber ?? workspace?.phoneNumber ?? null,
    totalParticipants: leaderboard.length,
    leaderboard: leaderboard.slice(0, 10)
  };
}

export async function getParticipantStatusByPhone(
  campaignId: string,
  phone: string
): Promise<ParticipantStatusSnapshot | null> {
  await ensureDatabase();
  return participantRepository.getStatusByPhone(campaignId, phone);
}

export async function getContactsOverview() {
  await ensureDatabase();
  const store = await getDemoStore();
  const entries = await contactSyncLedgerRepository.listByWorkspace(store.workspace.id);

  return {
    workspace: store.workspace,
    campaign: store.campaign,
    syncedContactsCount: entries.filter((entry) => Boolean(entry.syncedAt)).length,
    checkedContactsCount: entries.length,
    latestSync: entries[0]?.syncedAt ?? null
  };
}
