import net from "node:net";
import { cookies } from "next/headers";
import { prisma } from "@lottery/db";
import {
  CampaignRepository,
  ContactSyncLedgerRepository,
  ParticipantRepository,
  WhatsAppConnectionRepository,
  WorkspaceRepository,
  type CampaignLiveState,
  type CampaignMessageTemplate,
  type CampaignSettingsUpdate,
  type CampaignTemplateUpdateInput,
  type ConnectionSnapshot,
  type DashboardStats,
  type ParticipantStatusSnapshot
} from "@lottery/core";
import { auth } from "../auth";
import { getContactBotQuota } from "./contact-bot";

const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
const db = prisma as any;

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
  return;
}

function isSuperAdmin(session: any): boolean {
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  const sessionEmail = session?.user?.email?.toLowerCase();

  return session?.user?.globalRole === "SUPER_ADMIN" || sessionEmail === adminEmail;
}

function sessionUserId(session: any): string | null {
  return session?.user?.id ? String(session?.user?.id) : null;
}

async function assertCampaignAccess(campaignId: string, write = false) {
  const session = await auth();
  const userId = sessionUserId(session);

  if (!userId) {
    throw new Error("Unauthorized.");
  }

  const campaign = await db.campaign.findUnique({
    where: {
      id: campaignId
    },
    select: {
      id: true,
      workspaceId: true
    }
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (isSuperAdmin(session)) {
    return campaign;
  }

  const allowedRoles = write ? ["OWNER", "ADMIN", "EDITOR"] : ["OWNER", "ADMIN", "EDITOR", "VIEWER"];
  const membership = await db.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId: campaign.workspaceId,
      role: {
        in: allowedRoles
      }
    }
  });

  if (!membership) {
    throw new Error("Forbidden.");
  }

  return campaign;
}

async function assertConnectionAccess(connectionId: string, adminOnly = false): Promise<boolean> {
  const session = await auth();
  const userId = sessionUserId(session);

  if (!userId) {
    throw new Error("Unauthorized.");
  }

  if (isSuperAdmin(session)) {
    return true;
  }

  if (adminOnly) {
    throw new Error("Forbidden.");
  }

  const membership = await db.workspaceMember.findFirst({
    where: {
      userId,
      workspace: {
        OR: [
          {
            connections: {
              some: {
                id: connectionId
              }
            }
          },
          {
            connectionAssignments: {
              some: {
                connectionId,
                status: "active"
              }
            }
          }
        ]
      }
    }
  });

  if (!membership) {
    throw new Error("Forbidden.");
  }

  return false;
}

function snapshotFromConnection(
  connection: NonNullable<Awaited<ReturnType<WhatsAppConnectionRepository["findById"]>>>,
  workerOnline: boolean,
  includeSensitive: boolean
): ConnectionSnapshot {
  return {
    connectionId: connection.id,
    status: connection.status,
    provider: connection.provider,
    batteryLevel: workerOnline ? connection.batteryLevel : null,
    qrCode: includeSensitive && workerOnline ? connection.qrCode : null,
    phoneNumber: connection.phoneNumber,
    sessionKey: includeSensitive ? connection.sessionKey : "",
    lastError: includeSensitive ? connection.lastError : null,
    updatedAt: connection.updatedAt,
    workerOnline
  };
}

export async function getStoreForUser(userId: string) {
  await ensureDatabase();

  const workspace = await workspaceRepository.getWorkspaceForUser(userId);

  if (!workspace) {
    return null;
  }

  const campaign = await campaignRepository.getPrimaryCampaignByWorkspace(workspace.id);

  if (!campaign) {
    return null;
  }

  const connection =
    (await connectionRepository.findAssignedForWorkspace(workspace.id)) ??
    (await connectionRepository.findById(campaign.connectionId));

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

async function getStoreForWorkspace(workspaceId: string) {
  await ensureDatabase();

  const workspace = await workspaceRepository.findById(workspaceId);

  if (!workspace) {
    return null;
  }

  const campaign = await campaignRepository.getPrimaryCampaignByWorkspace(workspace.id);

  if (!campaign) {
    return null;
  }

  const connection =
    (await connectionRepository.findAssignedForWorkspace(workspace.id)) ??
    (await connectionRepository.findById(campaign.connectionId));

  if (!connection) {
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

export async function getPrimaryStore() {
  const session = await auth();
  const userId = sessionUserId(session);

  if (!userId) {
    return null;
  }

  if (isSuperAdmin(session)) {
    const adminWorkspaceId = (await cookies()).get("admin_workspace_id")?.value;
    const adminWorkspaceStore = adminWorkspaceId
      ? await getStoreForWorkspace(adminWorkspaceId)
      : null;

    if (adminWorkspaceStore) {
      return adminWorkspaceStore;
    }
  }

  const userStore = await getStoreForUser(userId);

  if (userStore) {
    return userStore;
  }

  if (!isSuperAdmin(session)) {
    return null;
  }

  await ensureDatabase();

  const workspace = await workspaceRepository.getPrimaryWorkspace();
  const campaign = await campaignRepository.getPrimaryCampaign();
  const connection = campaign ? await connectionRepository.findById(campaign.connectionId) : null;

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

export async function getRequiredStore() {
  const store = await getPrimaryStore();

  if (!store) {
    throw new Error("Unable to load workspace, campaign, or connection from the database.");
  }

  return store;
}

export async function getConnectionSnapshot(
  connectionId: string,
  options: { includeSensitive?: boolean } = {}
): Promise<ConnectionSnapshot> {
  await ensureDatabase();
  const connection = await connectionRepository.findById(connectionId);
  const workerOnline = await isWorkerOnline();

  if (!connection) {
    throw new Error("Connection not found.");
  }

  return snapshotFromConnection(connection, workerOnline, Boolean(options.includeSensitive));
}

export async function getConnectionSnapshotForCurrentUser(
  connectionId: string
): Promise<ConnectionSnapshot> {
  const includeSensitive = await assertConnectionAccess(connectionId);

  if (includeSensitive) {
    const session = await auth();

    await db.adminAuditLog.create({
      data: {
        actorUserId: sessionUserId(session),
        action: "ADMIN_CONNECTION_STATUS_ACCESS",
        targetType: "WhatsAppConnection",
        targetId: connectionId,
        metadata: {
          accessedAt: new Date().toISOString()
        }
      }
    });
  }

  return getConnectionSnapshot(connectionId, { includeSensitive });
}

export async function assertAdminConnectionAccess(connectionId: string): Promise<void> {
  await assertConnectionAccess(connectionId, true);
  const session = await auth();

  await db.adminAuditLog.create({
    data: {
      actorUserId: sessionUserId(session),
      action: "ADMIN_CONNECTION_TOOL_ACCESS",
      targetType: "WhatsAppConnection",
      targetId: connectionId,
      metadata: {
        accessedAt: new Date().toISOString()
      }
    }
  });
}

export async function launchOrReconnectConnection(
  connectionId: string
): Promise<ConnectionSnapshot> {
  await ensureDatabase();
  await assertAdminConnectionAccess(connectionId);
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
  await assertAdminConnectionAccess(connectionId);
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
  await assertCampaignAccess(campaignId);
  return campaignRepository.getTemplates(campaignId);
}

export async function updateTemplates(
  campaignId: string,
  updates: CampaignTemplateUpdateInput[]
): Promise<CampaignMessageTemplate[]> {
  await ensureDatabase();
  await assertCampaignAccess(campaignId, true);
  return campaignRepository.updateTemplates(campaignId, updates);
}

export async function updateCampaignSettings(
  campaignId: string,
  updates: CampaignSettingsUpdate
) {
  await ensureDatabase();
  await assertCampaignAccess(campaignId, true);
  return campaignRepository.updateSettings(campaignId, updates);
}

export async function getDashboardStats(campaignId: string): Promise<DashboardStats> {
  await ensureDatabase();
  await assertCampaignAccess(campaignId);
  return campaignRepository.getDashboardStats(campaignId);
}

export async function getCampaignLiveState(campaignId: string): Promise<CampaignLiveState> {
  await ensureDatabase();
  await assertCampaignAccess(campaignId);
  return campaignRepository.getLiveState(campaignId);
}

export async function runWinnerDraw(campaignId: string) {
  await ensureDatabase();
  await assertCampaignAccess(campaignId, true);
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

  const [connection, workspace, assignment] = await Promise.all([
    connectionRepository.findById(campaign.connectionId),
    db.workspace.findUnique({
      where: {
        id: campaign.workspaceId
      },
      select: {
        phoneNumber: true
      }
    }),
    db.workspaceConnectionAssignment.findFirst({
      where: {
        workspaceId: campaign.workspaceId,
        status: "active"
      },
      include: {
        connection: true
      },
      orderBy: {
        assignedAt: "desc"
      }
    })
  ]);
  const leaderboard = await participantRepository.getLeaderboard(campaign.id);

  return {
    campaign,
    whatsappPhone: assignment?.connection?.phoneNumber ?? connection?.phoneNumber ?? workspace?.phoneNumber ?? null,
    totalParticipants: leaderboard.length,
    // SECURITY: strip PII (full name + personal referral link) from public leaderboard.
    leaderboard: leaderboard.slice(0, 10).map((entry) => ({
      participantId: entry.participantId,
      anonymizedName: entry.anonymizedName,
      rank: entry.rank,
      referralsCount: entry.referralsCount,
      tickets: entry.tickets
    }))
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
  const store = await getPrimaryStore();

  if (!store) {
    throw new Error("Unable to load workspace, campaign, or connection from the database.");
  }

  const entries = await contactSyncLedgerRepository.listByWorkspace(store.workspace.id);
  const quota = await getContactBotQuota(store.workspace.id);

  return {
    workspace: store.workspace,
    campaign: store.campaign,
    entries,
    syncedContactsCount: entries.filter((entry) => entry.status === "synced_google").length,
    systemContactsCount: entries.filter((entry) => entry.status === "saved_system" || entry.status === "pending_google").length,
    duplicateContactsCount: entries.filter((entry) => entry.status === "duplicate").length,
    pendingContactsCount: entries.filter((entry) => entry.status === "quota_exceeded" || entry.status === "pending_google").length,
    checkedContactsCount: entries.length,
    latestSync: entries[0]?.syncedAt ?? null,
    quota
  };
}
