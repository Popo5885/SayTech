import { prisma } from "@lottery/db";
import { decryptSecret, encryptSecret } from "./crypto";
import {
  type Campaign,
  type CampaignLiveState,
  type CampaignMessageTemplate,
  type CampaignMode,
  type CampaignSettingsUpdate,
  type CampaignTemplateUpdateInput,
  type ConnectionSnapshot,
  type ContactSyncLedgerEntry,
  type DashboardStats,
  type DrawWeightMode,
  type LeaderboardEntry,
  type Participant,
  type ParticipantStatusSnapshot,
  type TemplateInteractiveConfig,
  type WhatsAppConnection,
  type WinnerDraw,
  type Workspace
} from "./domain";
import type { ProviderConnectionConfig } from "./providers";
import {
  buildDashboardStats,
  buildLeaderboard,
  generateReferralToken,
  getParticipantStatusSnapshot,
  normalizeCommand
} from "./leaderboard";
import {
  createDefaultTemplates,
  normalizeInteractiveConfig,
  renderTemplate
} from "./templates";

const db = prisma as any;

function campaignTypeToMode(type: string): CampaignMode {
  return type === "TRIGGER" ? "TRIGGER_JOIN" : "REFERRAL";
}

function modeToCampaignType(mode: CampaignMode): string {
  return mode === "TRIGGER_JOIN" ? "TRIGGER" : "REFERRAL";
}

function templateTypeToKey(type: string) {
  if (type === "STATUS") {
    return "STATUS_TICKETS" as const;
  }

  return type as CampaignMessageTemplate["key"];
}

function keyToTemplateType(key: CampaignMessageTemplate["key"]): string {
  if (key === "STATUS_TICKETS") {
    return "STATUS";
  }

  return key;
}

function mapInteractiveConfig(record: any): TemplateInteractiveConfig | null {
  return normalizeInteractiveConfig(record?.interactiveData as TemplateInteractiveConfig | null);
}

function mapWorkspace(record: any): Workspace {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    ownerName: record.ownerName,
    ownerEmail: record.ownerEmail,
    accountStatus: record.accountStatus,
    maxCampaigns: record.maxCampaigns,
    monthlyMessageLimit: record.monthlyMessageLimit ?? null,
    hasTelegramSupport: record.hasTelegramSupport ?? false,
    contractSignedAt: record.contractSignedAt ? record.contractSignedAt.toISOString() : null,
    phoneNumber: record.phoneNumber,
    whatsappStatus: record.whatsappStatus,
    contactBotBaseQuota: record.contactBotBaseQuota ?? 600,
    contactBotExtraQuota: record.contactBotExtraQuota ?? 0,
    contactBotUsedQuota: record.contactBotUsedQuota ?? 0,
    contactBotMonthlyPriceCents: record.contactBotMonthlyPriceCents ?? 5000,
    enabledModules: record.enabledModules ?? ["core"],
    numberPoolStatus: record.numberPoolStatus ?? "waiting",
    onboardingTourStep: record.onboardingTourStep ?? 0,
    onboardingTourCompletedAt: record.onboardingTourCompletedAt
      ? record.onboardingTourCompletedAt.toISOString()
      : null,
    createdAt: record.createdAt.toISOString()
  };
}

function mapConnection(record: any): WhatsAppConnection {
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    provider: record.provider,
    label: record.label,
    status: record.status,
    maxTenants: record.maxTenants ?? 3,
    currentTenants: record.currentTenants ?? 0,
    batteryLevel: record.batteryLevel,
    qrCode: record.qrCode,
    phoneNumber: record.phoneNumber,
    sessionKey: record.sessionKey,
    officialPhoneNumberId: record.officialPhoneNumberId ?? null,
    officialWabaId: record.officialWabaId ?? null,
    lastError: record.lastError,
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapProviderConnectionConfig(record: any): ProviderConnectionConfig {
  return {
    connectionId: record.id,
    sessionKey: record.sessionKey,
    provider: record.provider,
    officialPhoneNumberId: record.officialPhoneNumberId ?? null,
    officialWabaId: record.officialWabaId ?? null,
    officialAccessToken: record.officialAccessTokenEncrypted
      ? decryptSecret(record.officialAccessTokenEncrypted)
      : null
  };
}

function mapTemplate(record: any): CampaignMessageTemplate {
  return {
    id: record.id,
    campaignId: record.campaignId,
    key: templateTypeToKey(record.type),
    label: record.label ?? templateTypeToKey(record.type),
    value: record.content,
    isEnabled: record.isEnabled ?? true,
    mediaUrl: record.mediaUrl ?? null,
    mediaType: record.mediaType ?? null,
    interactive: mapInteractiveConfig(record)
  };
}

function mapCampaign(record: any): Campaign {
  const mode = campaignTypeToMode(record.type);

  return {
    id: record.id,
    workspaceId: record.workspaceId,
    connectionId: record.connectionId,
    name: record.name,
    slug: record.slug,
    mode,
    triggerWord: record.triggerWord,
    drawDate: record.drawDate ? record.drawDate.toISOString() : null,
    drawWeightMode:
      record.drawWeightMode ?? (mode === "TRIGGER_JOIN" ? "ONE_PER_PARTICIPANT" : "STORED_TICKETS"),
    contactTagName: record.contactTagName ?? defaultContactTagName(record.name ?? "Lottery"),
    googleContactGroupResourceName: record.googleContactGroupResourceName ?? null,
    statusCommandAliases: record.statusCommandAliases ?? [],
    isActive: record.isActive,
    collectEmail: record.collectEmail ?? false,
    groupInviteLink: record.groupInviteLink ?? null,
    messageCount: record.messageCount ?? 0,
    createdAt: record.createdAt.toISOString(),
    templates: Array.isArray(record.templates) ? record.templates.map(mapTemplate) : []
  };
}

function mapParticipant(record: any): Participant {
  return {
    id: record.id,
    campaignId: record.campaignId,
    name: record.name ?? "חבר",
    phone: record.phone,
    chatAddress: record.chatAddress ?? null,
    referralToken: record.referralCode,
    referralLink: record.referralLink,
    referralsCount: record.referralsCount ?? 0,
    tickets: record.tickets ?? 1,
    joinedAt: record.createdAt.toISOString(),
    referredByParticipantId: record.referrerId ?? null,
    email: record.email ?? null,
    onboardingState: record.onboardingState ?? "REGISTERED",
    contactSavedConfirmed: record.contactSavedConfirmed ?? true,
    statusProofReceived: record.statusProofReceived ?? false,
    statusProofMediaUrl: record.statusProofMediaUrl ?? null,
    pendingReferralCode: record.pendingReferralCode ?? null,
    pendingReferrerPhone: record.pendingReferrerPhone ?? null
  };
}

function mapContactSyncLedger(record: any): ContactSyncLedgerEntry {
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    phone: record.phone,
    displayName: record.displayName,
    googlePersonResourceName: record.googlePersonResourceName ?? null,
    lastCampaignId: record.lastCampaignId ?? null,
    status: record.status ?? "saved_system",
    quotaCounted: Boolean(record.quotaCounted),
    syncedAt: record.syncedAt ? record.syncedAt.toISOString() : null,
    lastCheckedAt: record.lastCheckedAt.toISOString()
  };
}

function mapWinnerDraw(record: any): WinnerDraw {
  return {
    id: record.id,
    campaignId: record.campaignId,
    participantId: record.participantId,
    participantName: record.participantName,
    participantPhone: record.participantPhone,
    createdAt: record.createdAt.toISOString()
  };
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "workspace"
  );
}

function defaultContactTagName(name: string): string {
  const compact = name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return compact ? `${compact}_Lottery` : "Lottery_Campaign_1";
}

function normalizeChatAddressIdentity(chatAddress: string | null | undefined): string | null {
  const compact = chatAddress?.trim();

  if (!compact) {
    return null;
  }

  return compact.replace(/@.+$/, "") || null;
}

function resolveDrawWeight(
  drawWeightMode: DrawWeightMode,
  participant: Pick<Participant, "tickets" | "referralsCount">
): number {
  switch (drawWeightMode) {
    case "ONE_PER_PARTICIPANT":
      return 1;
    case "REFERRALS_HALVED":
      return Math.max(Math.floor(participant.referralsCount / 2), 0);
    default:
      return Math.max(participant.tickets, 0);
  }
}

function isRegisteredParticipant(participant: Participant): boolean {
  return participant.onboardingState === "REGISTERED";
}

export interface GoogleWorkspaceAuth {
  workspaceId?: string | null;
  ownerEmail: string;
  ownerName: string;
  googleSubject: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
}

export interface GoogleSyncAccount {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiry?: Date | null;
  contactTemplate: string;
}

export class WorkspaceRepository {
  async findById(workspaceId: string): Promise<Workspace | null> {
    const workspace = await db.workspace.findUnique({
      where: {
        id: workspaceId
      }
    });

    return workspace ? mapWorkspace(workspace) : null;
  }

  async getPrimaryWorkspace(): Promise<Workspace | null> {
    const workspace = await db.workspace.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    });

    return workspace ? mapWorkspace(workspace) : null;
  }

  async getWorkspaceForUser(userId: string): Promise<Workspace | null> {
    const membership = await db.workspaceMember.findFirst({
      where: {
        userId,
        workspace: {
          accountStatus: "active"
        }
      },
      include: {
        workspace: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return membership?.workspace ? mapWorkspace(membership.workspace) : null;
  }

  async updateOnboardingTourStep(workspaceId: string, step: number): Promise<Workspace> {
    const workspace = await db.workspace.update({
      where: {
        id: workspaceId
      },
      data: {
        onboardingTourStep: Math.max(0, step)
      }
    });

    return mapWorkspace(workspace);
  }

  async completeOnboardingTour(workspaceId: string): Promise<Workspace> {
    const workspace = await db.workspace.update({
      where: {
        id: workspaceId
      },
      data: {
        onboardingTourCompletedAt: new Date(),
        onboardingTourStep: 12
      }
    });

    return mapWorkspace(workspace);
  }

  async upsertGoogleOAuthTokens(input: GoogleWorkspaceAuth): Promise<Workspace> {
    const encryptedAccessToken = encryptSecret(input.accessToken);
    const encryptedRefreshToken = input.refreshToken ? encryptSecret(input.refreshToken) : null;
    const existingWorkspace = input.workspaceId
      ? await db.workspace.findUnique({
          where: {
            id: input.workspaceId
          }
        })
      : await db.workspace.findUnique({
          where: {
            ownerEmail: input.ownerEmail
          }
        });
    const googleTokenExpiry = input.expiresAt ? new Date(input.expiresAt * 1000) : null;
    const workspace = existingWorkspace
      ? await db.workspace.update({
          where: {
            id: existingWorkspace.id
          },
          data: {
            ownerName: input.ownerName,
            ownerEmail: input.ownerEmail,
            googleSubject: input.googleSubject,
            googleAccessTokenEncrypted: encryptedAccessToken,
            googleRefreshTokenEncrypted:
              encryptedRefreshToken ?? existingWorkspace.googleRefreshTokenEncrypted ?? null,
            googleTokenExpiry
          }
        })
      : await db.workspace.create({
          data: {
            id: input.workspaceId ?? undefined,
            name: `${input.ownerName || input.ownerEmail}'s Workspace`,
            slug: slugify(input.ownerEmail.split("@")[0] ?? input.ownerName),
            ownerName: input.ownerName,
            ownerEmail: input.ownerEmail,
            googleSubject: input.googleSubject,
            googleAccessTokenEncrypted: encryptedAccessToken,
            googleRefreshTokenEncrypted: encryptedRefreshToken,
            googleTokenExpiry
          }
        });

    return mapWorkspace(workspace);
  }

  async getGoogleSyncAccount(workspaceId: string): Promise<GoogleSyncAccount | null> {
    const workspace = await db.workspace.findUnique({
      where: {
        id: workspaceId
      }
    });

    if (!workspace?.googleAccessTokenEncrypted) {
      return null;
    }

    return {
      accessToken: decryptSecret(workspace.googleAccessTokenEncrypted),
      refreshToken: workspace.googleRefreshTokenEncrypted
        ? decryptSecret(workspace.googleRefreshTokenEncrypted)
        : null,
      tokenExpiry: workspace.googleTokenExpiry ?? null,
      contactTemplate: workspace.googleContactTemplate ?? "{{name}}+בוט"
    };
  }
}

export class WhatsAppConnectionRepository {
  async getPrimaryConnectionConfig(): Promise<ProviderConnectionConfig | null> {
    const connection = await db.whatsAppConnection.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    });

    return connection ? mapProviderConnectionConfig(connection) : null;
  }

  async getPrimaryConnection(): Promise<WhatsAppConnection | null> {
    const connection = await db.whatsAppConnection.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    });

    return connection ? mapConnection(connection) : null;
  }

  async findById(connectionId: string): Promise<WhatsAppConnection | null> {
    const connection = await db.whatsAppConnection.findUnique({
      where: {
        id: connectionId
      }
    });

    return connection ? mapConnection(connection) : null;
  }

  async findAvailablePoolConnection(): Promise<WhatsAppConnection | null> {
    const connections = await db.whatsAppConnection.findMany({
      where: {
        status: "connected",
        phoneNumber: {
          not: null
        }
      },
      orderBy: [
        {
          currentTenants: "asc"
        },
        {
          updatedAt: "desc"
        }
      ]
    });
    const connection = connections.find(
      (candidate: any) => (candidate.currentTenants ?? 0) < (candidate.maxTenants ?? 3)
    );

    return connection ? mapConnection(connection) : null;
  }

  async findAssignedForWorkspace(workspaceId: string): Promise<WhatsAppConnection | null> {
    const assignment = await db.workspaceConnectionAssignment.findFirst({
      where: {
        workspaceId,
        status: "active"
      },
      include: {
        connection: true
      },
      orderBy: {
        assignedAt: "desc"
      }
    });

    return assignment?.connection ? mapConnection(assignment.connection) : null;
  }

  async updateSnapshot(
    connectionId: string,
    updates: Partial<ConnectionSnapshot>
  ): Promise<WhatsAppConnection> {
    const connection = await db.whatsAppConnection.update({
      where: {
        id: connectionId
      },
      data: {
        status: updates.status,
        batteryLevel: updates.batteryLevel,
        qrCode: updates.qrCode,
        phoneNumber: updates.phoneNumber,
        lastError: updates.lastError
      }
    });

    const whatsappStatus = connection.status === "connected" ? "CONNECTED" : "DISCONNECTED";

    await Promise.all([
      db.workspace.update({
        where: {
          id: connection.workspaceId
        },
        data: {
          whatsappStatus
        }
      }),
      db.workspace.updateMany({
        where: {
          connectionAssignments: {
            some: {
              connectionId: connection.id,
              status: "active"
            }
          }
        },
        data: {
          whatsappStatus,
          phoneNumber: connection.phoneNumber
        }
      })
    ]);

    return mapConnection(connection);
  }

  async markConnected(connectionId: string): Promise<WhatsAppConnection> {
    return this.updateSnapshot(connectionId, {
      status: "connected",
      qrCode: null,
      batteryLevel: 84,
      phoneNumber: "+972500000001",
      lastError: null
    });
  }

  async regenerateQr(connectionId: string): Promise<WhatsAppConnection> {
    return this.updateSnapshot(connectionId, {
      status: "qr_ready",
      qrCode: `2@${generateReferralToken()}-${Date.now()}`,
      batteryLevel: null,
      phoneNumber: null,
      lastError: null
    });
  }
}

export class ContactSyncLedgerRepository {
  async listByWorkspace(workspaceId: string): Promise<ContactSyncLedgerEntry[]> {
    const entries = await db.contactSyncLedger.findMany({
      where: {
        workspaceId
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return entries.map(mapContactSyncLedger);
  }

  async findByPhone(
    workspaceId: string,
    phone: string
  ): Promise<ContactSyncLedgerEntry | null> {
    const entry = await db.contactSyncLedger.findUnique({
      where: {
        workspaceId_phone: {
          workspaceId,
          phone
        }
      }
    });

    return entry ? mapContactSyncLedger(entry) : null;
  }

  async upsert(input: {
    workspaceId: string;
    phone: string;
    displayName: string;
    googlePersonResourceName?: string | null;
    lastCampaignId?: string | null;
    syncedAt?: Date | null;
    status?: "saved_system" | "synced_google" | "duplicate" | "quota_exceeded" | "pending_google";
    quotaCounted?: boolean;
    lastCheckedAt?: Date;
  }): Promise<ContactSyncLedgerEntry> {
    const entry = await db.contactSyncLedger.upsert({
      where: {
        workspaceId_phone: {
          workspaceId: input.workspaceId,
          phone: input.phone
        }
      },
      update: {
        displayName: input.displayName,
        googlePersonResourceName: input.googlePersonResourceName ?? null,
        lastCampaignId: input.lastCampaignId ?? null,
        status: input.status ?? "saved_system",
        quotaCounted: input.quotaCounted ?? false,
        syncedAt: input.syncedAt ?? null,
        lastCheckedAt: input.lastCheckedAt ?? new Date()
      },
      create: {
        workspaceId: input.workspaceId,
        phone: input.phone,
        displayName: input.displayName,
        googlePersonResourceName: input.googlePersonResourceName ?? null,
        lastCampaignId: input.lastCampaignId ?? null,
        status: input.status ?? "saved_system",
        quotaCounted: input.quotaCounted ?? false,
        syncedAt: input.syncedAt ?? null,
        lastCheckedAt: input.lastCheckedAt ?? new Date()
      }
    });

    return mapContactSyncLedger(entry);
  }
}

export class ParticipantRepository {
  constructor(private readonly baseUrl: string) {}

  async listByCampaign(
    campaignId: string,
    options: {
      registeredOnly?: boolean;
    } = {}
  ): Promise<Participant[]> {
    const participants = await db.participant.findMany({
      where: {
        campaignId,
        ...(options.registeredOnly ? { onboardingState: "REGISTERED" } : {})
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return participants.map(mapParticipant);
  }

  async findByPhone(campaignId: string, phone: string): Promise<Participant | null> {
    const participant = await db.participant.findFirst({
      where: {
        campaignId,
        phone
      }
    });

    return participant ? mapParticipant(participant) : null;
  }

  async findByReferralCode(
    campaignId: string,
    referralCode: string
  ): Promise<Participant | null> {
    const participant = await db.participant.findFirst({
      where: {
        campaignId,
        referralCode
      }
    });

    return participant ? mapParticipant(participant) : null;
  }

  async findById(participantId: string): Promise<Participant | null> {
    const participant = await db.participant.findUnique({
      where: {
        id: participantId
      }
    });

    return participant ? mapParticipant(participant) : null;
  }

  async createIfMissing(input: {
    campaignId: string;
    campaignSlug: string;
    phone: string;
    chatAddress: string | null;
    name: string | null;
  }): Promise<{ participant: Participant; isNew: boolean }> {
    const chatIdentity = normalizeChatAddressIdentity(input.chatAddress);
    const existingRecord = await db.participant.findFirst({
      where: {
        campaignId: input.campaignId,
        OR: [
          {
            phone: input.phone
          },
          ...(input.chatAddress
            ? [
                {
                  chatAddress: input.chatAddress
                }
              ]
            : []),
          ...(chatIdentity
            ? [
                {
                  phone: chatIdentity
                }
              ]
            : [])
        ]
      }
    });

    if (existingRecord) {
      const existing = await db.participant.update({
        where: {
          id: existingRecord.id
        },
        data: {
          phone: input.phone || existingRecord.phone,
          chatAddress: input.chatAddress ?? existingRecord.chatAddress ?? null,
          name: existingRecord.name ?? input.name?.trim() ?? null
        }
      });

      return { participant: mapParticipant(existing), isNew: false };
    }

    const referralCode = generateReferralToken();
    const participant = await db.participant.create({
      data: {
        campaignId: input.campaignId,
        phone: input.phone,
        chatAddress: input.chatAddress,
        name: input.name?.trim() || null,
        referralCode,
        referralLink: `${this.baseUrl}/join/${input.campaignSlug}?ref=${referralCode}`,
        onboardingState: "AWAITING_NAME",
        contactSavedConfirmed: false
      }
    });

    return {
      participant: mapParticipant(participant),
      isNew: true
    };
  }

  async attachPendingReferralCode(
    participantId: string,
    referralCode: string | null
  ): Promise<Participant> {
    const participant = await db.participant.update({
      where: {
        id: participantId
      },
      data: {
        pendingReferralCode: referralCode?.trim().toUpperCase() || null
      }
    });

    return mapParticipant(participant);
  }

  async captureName(participantId: string, name: string): Promise<Participant> {
    const participant = await db.participant.update({
      where: {
        id: participantId
      },
      data: {
        name: name.trim(),
        onboardingState: "AWAITING_REFERRER"
      }
    });

    return mapParticipant(participant);
  }

  async markAwaitingEmail(participantId: string): Promise<Participant> {
    const participant = await db.participant.update({
      where: {
        id: participantId
      },
      data: {
        onboardingState: "AWAITING_EMAIL"
      }
    });

    return mapParticipant(participant);
  }

  async captureEmail(participantId: string, email: string): Promise<Participant> {
    const participant = await db.participant.update({
      where: {
        id: participantId
      },
      data: {
        email: email.trim().toLowerCase(),
        onboardingState: "AWAITING_REFERRER"
      }
    });

    return mapParticipant(participant);
  }

  async saveReferrerHint(input: {
    participantId: string;
    phoneHint?: string | null;
    referralCode?: string | null;
  }): Promise<Participant> {
    const participant = await db.participant.update({
      where: {
        id: input.participantId
      },
      data: {
        pendingReferrerPhone: input.phoneHint?.trim() || null,
        pendingReferralCode: input.referralCode?.trim().toUpperCase() || null,
        onboardingState: "AWAITING_CONTACT_SAVED"
      }
    });

    return mapParticipant(participant);
  }

  async markAwaitingContactSave(participantId: string): Promise<Participant> {
    const participant = await db.participant.update({
      where: {
        id: participantId
      },
      data: {
        onboardingState: "AWAITING_CONTACT_SAVED"
      }
    });

    return mapParticipant(participant);
  }

  async rejectContactSave(participantId: string): Promise<Participant> {
    const participant = await db.participant.update({
      where: {
        id: participantId
      },
      data: {
        onboardingState: "AWAITING_CONTACT_SAVED",
        contactSavedConfirmed: false
      }
    });

    return mapParticipant(participant);
  }

  async completeRegistration(input: {
    campaignId: string;
    participantId: string;
  }): Promise<{ participant: Participant; referrer: Participant | null }> {
    return db.$transaction(async (tx: any) => {
      const participant = await tx.participant.findUnique({
        where: {
          id: input.participantId
        }
      });

      if (!participant) {
        throw new Error("Participant not found.");
      }

      const alreadyLinkedToReferrer = Boolean(participant.referrerId);
      let referrer = participant.referrerId
        ? await tx.participant.findUnique({
            where: {
              id: participant.referrerId
            }
          })
        : null;

      if (!referrer && participant.pendingReferralCode) {
        referrer = await tx.participant.findFirst({
          where: {
            campaignId: input.campaignId,
            referralCode: participant.pendingReferralCode,
            onboardingState: "REGISTERED"
          }
        });
      }

      if (!referrer && participant.pendingReferrerPhone) {
        referrer = await tx.participant.findFirst({
          where: {
            campaignId: input.campaignId,
            phone: participant.pendingReferrerPhone,
            onboardingState: "REGISTERED"
          }
        });
      }

      if (referrer?.id === participant.id) {
        referrer = null;
      }

      const updatedParticipant = await tx.participant.update({
        where: {
          id: participant.id
        },
        data: {
          referrerId: referrer?.id ?? null,
          onboardingState: "REGISTERED",
          contactSavedConfirmed: true,
          pendingReferralCode: null,
          pendingReferrerPhone: null,
          tickets: participant.tickets > 0 ? participant.tickets : 1,
          name: participant.name?.trim() || "חבר"
        }
      });

      let updatedReferrer = null;

      if (referrer && !alreadyLinkedToReferrer) {
        updatedReferrer = await tx.participant.update({
          where: {
            id: referrer.id
          },
          data: {
            referralsCount: {
              increment: 1
            },
            tickets: {
              increment: 2
            }
          }
        });
      }

      return {
        participant: mapParticipant(updatedParticipant),
        referrer: updatedReferrer ? mapParticipant(updatedReferrer) : null
      };
    });
  }

  async getStatusByPhone(
    campaignId: string,
    phone: string
  ): Promise<ParticipantStatusSnapshot | null> {
    const participant = await this.findByPhone(campaignId, phone);

    if (!participant || !isRegisteredParticipant(participant)) {
      return null;
    }

    const participants = await this.listByCampaign(campaignId, {
      registeredOnly: true
    });
    return getParticipantStatusSnapshot(participants, participant.id);
  }

  async getLeaderboard(campaignId: string): Promise<LeaderboardEntry[]> {
    const participants = await this.listByCampaign(campaignId, {
      registeredOnly: true
    });
    return buildLeaderboard(participants);
  }
}

export class CampaignRepository {
  constructor(private readonly baseUrl: string) {}

  async getPrimaryCampaign(): Promise<Campaign | null> {
    const campaign = await db.campaign.findFirst({
      include: {
        templates: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (!campaign) {
      return null;
    }

    return {
      ...mapCampaign(campaign),
      templates: await this.getTemplates(campaign.id)
    };
  }

  async getPrimaryCampaignByWorkspace(workspaceId: string): Promise<Campaign | null> {
    const campaign = await db.campaign.findFirst({
      where: {
        workspaceId
      },
      include: {
        templates: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (!campaign) {
      return null;
    }

    return {
      ...mapCampaign(campaign),
      templates: await this.getTemplates(campaign.id)
    };
  }

  async findById(campaignId: string): Promise<Campaign | null> {
    const campaign = await db.campaign.findUnique({
      where: {
        id: campaignId
      },
      include: {
        templates: true
      }
    });

    if (!campaign) {
      return null;
    }

    return {
      ...mapCampaign(campaign),
      templates: await this.getTemplates(campaign.id)
    };
  }

  async findBySlug(slug: string): Promise<Campaign | null> {
    const campaign = await db.campaign.findUnique({
      where: {
        slug
      },
      include: {
        templates: true
      }
    });

    if (!campaign) {
      return null;
    }

    return {
      ...mapCampaign(campaign),
      templates: await this.getTemplates(campaign.id)
    };
  }

  async findActiveByConnectionId(connectionId: string): Promise<Campaign | null> {
    const campaign = await db.campaign.findFirst({
      where: {
        connectionId,
        isActive: true
      },
      include: {
        templates: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!campaign) {
      return null;
    }

    return {
      ...mapCampaign(campaign),
      templates: await this.getTemplates(campaign.id)
    };
  }

  async findActiveByConnectionAndMessage(
    connectionId: string,
    messageBody: string
  ): Promise<Campaign | null> {
    const campaigns = await db.campaign.findMany({
      where: {
        connectionId,
        isActive: true
      },
      include: {
        templates: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (campaigns.length === 0) {
      return null;
    }

    if (campaigns.length === 1) {
      const [campaign] = campaigns;

      return {
        ...mapCampaign(campaign),
        templates: await this.getTemplates(campaign.id)
      };
    }

    const normalizedBody = normalizeCommand(messageBody);
    const rankedCandidates: Array<{ campaign: any; score: number }> = campaigns.map(
      (campaign: any) => {
        const trigger = normalizeCommand(campaign.triggerWord ?? "");
        const keywordScore =
          trigger && normalizedBody.includes(trigger) ? trigger.length + 100 : 0;

        return {
          campaign,
          score: keywordScore
        };
      }
    );
    const selected =
      rankedCandidates
        .filter((candidate: { campaign: any; score: number }) => candidate.score > 0)
        .sort(
          (left: { campaign: any; score: number }, right: { campaign: any; score: number }) =>
            right.score - left.score
        )[0]?.campaign ?? null;

    if (!selected) {
      return null;
    }

    return {
      ...mapCampaign(selected),
      templates: await this.getTemplates(selected.id)
    };
  }

  async getTemplates(campaignId: string): Promise<CampaignMessageTemplate[]> {
    const defaults = createDefaultTemplates(campaignId);
    const templates: any[] = await db.messageTemplate.findMany({
      where: {
        campaignId
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const existingKeys = new Set(
      templates.map((template) => templateTypeToKey(template.type))
    );

    for (const template of defaults) {
      if (existingKeys.has(template.key)) {
        continue;
      }

      await db.messageTemplate.create({
        data: {
          id: template.id,
          campaignId,
          type: keyToTemplateType(template.key),
          label: template.label,
          content: template.value,
          isEnabled: template.isEnabled,
          mediaUrl: template.mediaUrl,
          mediaType: template.mediaType,
          interactiveType: template.interactive?.kind ?? "NONE",
          interactiveData: template.interactive ?? null
        }
      });
    }

    const syncedTemplates: any[] =
      existingKeys.size === defaults.length && templates.length === defaults.length
        ? templates
        : await db.messageTemplate.findMany({
            where: {
              campaignId
            },
            orderBy: {
              createdAt: "asc"
            }
          });
    const orderByKey = new Map(defaults.map((template, index) => [template.key, index]));
    const mappedTemplates = syncedTemplates.map(mapTemplate);

    return mappedTemplates
      .sort(
        (left: CampaignMessageTemplate, right: CampaignMessageTemplate) =>
          (orderByKey.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
          (orderByKey.get(right.key) ?? Number.MAX_SAFE_INTEGER)
      );
  }

  async updateTemplates(
    campaignId: string,
    updates: CampaignTemplateUpdateInput[]
  ): Promise<CampaignMessageTemplate[]> {
    const currentTemplates = await this.getTemplates(campaignId);
    const templateByKey = new Map(currentTemplates.map((template) => [template.key, template]));

    for (const update of updates) {
      const current = templateByKey.get(update.key);

      await db.messageTemplate.upsert({
        where: {
          campaignId_type: {
            campaignId,
            type: keyToTemplateType(update.key)
          }
        },
        update: {
          content: update.value,
          label: current?.label ?? update.key,
          isEnabled: update.isEnabled ?? current?.isEnabled ?? true,
          mediaUrl: update.mediaUrl === undefined ? current?.mediaUrl ?? null : update.mediaUrl,
          mediaType:
            update.mediaType === undefined ? current?.mediaType ?? null : update.mediaType,
          interactiveType:
            update.interactive === undefined
              ? current?.interactive?.kind ?? "NONE"
              : update.interactive?.kind ?? "NONE",
          interactiveData:
            update.interactive === undefined
              ? current?.interactive ?? null
              : normalizeInteractiveConfig(update.interactive)
        },
        create: {
          campaignId,
          type: keyToTemplateType(update.key),
          label: current?.label ?? update.key,
          content: update.value,
          isEnabled: update.isEnabled ?? current?.isEnabled ?? true,
          mediaUrl: update.mediaUrl ?? null,
          mediaType: update.mediaType ?? null,
          interactiveType: update.interactive?.kind ?? "NONE",
          interactiveData: normalizeInteractiveConfig(update.interactive)
        }
      });
    }

    return this.getTemplates(campaignId);
  }

  async updateSettings(
    campaignId: string,
    updates: CampaignSettingsUpdate
  ): Promise<Campaign> {
    const campaign = await db.campaign.update({
      where: {
        id: campaignId
      },
      include: {
        templates: true
      },
      data: {
        drawDate:
          updates.drawDate === undefined
            ? undefined
            : updates.drawDate
              ? new Date(updates.drawDate)
              : null,
        drawWeightMode: updates.drawWeightMode
      }
    });

    return {
      ...mapCampaign(campaign),
      templates: await this.getTemplates(campaign.id)
    };
  }

  async updateGoogleContactGroupResourceName(
    campaignId: string,
    googleContactGroupResourceName: string
  ): Promise<Campaign> {
    const campaign = await db.campaign.update({
      where: {
        id: campaignId
      },
      include: {
        templates: true
      },
      data: {
        googleContactGroupResourceName
      }
    });

    return {
      ...mapCampaign(campaign),
      templates: await this.getTemplates(campaign.id)
    };
  }

  async incrementMessageCount(campaignId: string, amount: number): Promise<void> {
    await db.campaign.update({
      where: {
        id: campaignId
      },
      data: {
        messageCount: {
          increment: amount
        }
      }
    });
  }

  async getDashboardStats(campaignId: string): Promise<DashboardStats> {
    const campaign = await this.findById(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    const participantRepository = new ParticipantRepository(this.baseUrl);
    const participants = await participantRepository.listByCampaign(campaignId, {
      registeredOnly: true
    });
    const latestWinnerRaw = await db.winnerDraw.findFirst({
      where: {
        campaignId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const latestOutboundMessage = await db.messageLog.findFirst({
      where: {
        campaignId,
        direction: "OUTBOUND",
        status: {
          in: ["queued", "sent"]
        },
        body: {
          not: null
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        body: true,
        createdAt: true,
        status: true
      }
    });

    return {
      ...buildDashboardStats(
      campaign,
      participants,
      campaign.messageCount,
      latestWinnerRaw ? [mapWinnerDraw(latestWinnerRaw)] : [],
      participants.reduce((sum, participant) => sum + participant.referralsCount, 0)
      ),
      latestOutboundMessage: latestOutboundMessage
        ? {
            body: latestOutboundMessage.body,
            createdAt: latestOutboundMessage.createdAt.toISOString(),
            status: latestOutboundMessage.status
          }
        : null
    };
  }

  async getLiveState(campaignId: string): Promise<CampaignLiveState> {
    const campaign = await this.findById(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    const participantRepository = new ParticipantRepository(this.baseUrl);
    const participants = await participantRepository.listByCampaign(campaignId);

    return {
      campaign,
      participants,
      stats: await this.getDashboardStats(campaignId),
      updatedAt: new Date().toISOString()
    };
  }

  async drawWeightedWinner(campaignId: string): Promise<WinnerDraw | null> {
    const campaign = await this.findById(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    const participants = (await db.participant.findMany({
      where: {
        campaignId,
        onboardingState: "REGISTERED"
      }
    })) as any[];

    const weightedParticipants = participants
      .map((participant) => ({
        participant,
        weight: resolveDrawWeight(campaign.drawWeightMode, mapParticipant(participant))
      }))
      .filter((entry) => entry.weight > 0);

    if (weightedParticipants.length === 0) {
      return null;
    }

    const totalWeight = weightedParticipants.reduce(
      (sum, entry) => sum + entry.weight,
      0
    );

    let threshold = Math.random() * totalWeight;
    let winnerRecord = weightedParticipants[0].participant;

    for (const entry of weightedParticipants) {
      threshold -= entry.weight;

      if (threshold <= 0) {
        winnerRecord = entry.participant;
        break;
      }
    }

    const winner = await db.winnerDraw.create({
      data: {
        campaignId,
        participantId: winnerRecord.id,
        participantName: winnerRecord.name ?? "Friend",
        participantPhone: winnerRecord.phone
      }
    });

    await this.incrementMessageCount(campaignId, 1);

    return mapWinnerDraw(winner);
  }

  async buildWinnerMessage(campaignId: string, winner: WinnerDraw): Promise<string> {
    const campaign = await this.findById(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    const winnerTemplate =
      campaign.templates.find((template) => template.key === "WINNER")?.value ??
      "Congratulations {{name}}!";

    return renderTemplate(winnerTemplate, {
      name: winner.participantName,
      tickets: 0,
      link: `${this.baseUrl}/join/${campaign.slug}`,
      referrals: 0,
      rank: 1,
      top10: "",
      contact_phone: winner.participantPhone,
      campaign_name: campaign.name,
      ref: "",
      email: "",
      group_invite_link: campaign.groupInviteLink ?? ""
    });
  }
}
