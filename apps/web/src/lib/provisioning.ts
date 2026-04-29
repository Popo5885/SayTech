import { DEFAULT_STATUS_COMMANDS, type CampaignMessageTemplate } from "@lottery/core";
import { createDefaultTemplates } from "@lottery/core/templates";
import { prisma } from "@lottery/db";

const db = prisma as any;

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function templateType(key: CampaignMessageTemplate["key"]): string {
  return key === "STATUS_TICKETS" ? "STATUS" : key;
}

async function findAvailablePoolConnection(tx: any) {
  const connections = await tx.whatsAppConnection.findMany({
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

  return connections.find(
    (connection: any) => (connection.currentTenants ?? 0) < (connection.maxTenants ?? 3)
  );
}

async function assignPoolConnection(tx: any, workspaceId: string, userId: string) {
  const existingAssignment = await tx.workspaceConnectionAssignment.findFirst({
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

  if (existingAssignment?.connection) {
    return existingAssignment.connection;
  }

  const connection = await findAvailablePoolConnection(tx);

  if (!connection) {
    await tx.workspace.update({
      where: {
        id: workspaceId
      },
      data: {
        numberPoolStatus: "waiting",
        whatsappStatus: "DISCONNECTED"
      }
    });
    await tx.adminAuditLog.create({
      data: {
        actorUserId: userId,
        action: "POOL_ASSIGNMENT_WAITING",
        targetType: "Workspace",
        targetId: workspaceId,
        metadata: {
          reason: "No connected WhatsApp session has a free tenant slot."
        }
      }
    });
    return null;
  }

  await tx.workspaceConnectionAssignment.create({
    data: {
      workspaceId,
      connectionId: connection.id,
      assignedByUserId: userId
    }
  });
  await tx.whatsAppConnection.update({
    where: {
      id: connection.id
    },
    data: {
      currentTenants: {
        increment: 1
      }
    }
  });
  await tx.workspace.update({
    where: {
      id: workspaceId
    },
    data: {
      numberPoolStatus: "assigned",
      phoneNumber: connection.phoneNumber,
      whatsappStatus: "CONNECTED"
    }
  });
  await tx.adminAuditLog.create({
    data: {
      actorUserId: userId,
      action: "POOL_CONNECTION_ASSIGNED",
      targetType: "Workspace",
      targetId: workspaceId,
      metadata: {
        connectionId: connection.id,
        phoneNumber: connection.phoneNumber,
        currentTenants: (connection.currentTenants ?? 0) + 1,
        maxTenants: connection.maxTenants ?? 3
      }
    }
  });

  return connection;
}

export async function provisionWorkspaceForUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user?.email) {
    return null;
  }

  const existingWorkspace = await db.workspace.findUnique({
    where: { ownerEmail: user.email }
  });

  if (existingWorkspace) {
    return db.$transaction(async (tx: any) => {
      const workspace = await tx.workspace.update({
        where: { id: existingWorkspace.id },
        data: {
          accountStatus: "active",
          ownerName: user.fullName ?? user.name ?? existingWorkspace.ownerName
        }
      });
      const poolConnection = await assignPoolConnection(tx, workspace.id, user.id);

      if (poolConnection) {
        await tx.campaign.updateMany({
          where: {
            workspaceId: workspace.id
          },
          data: {
            connectionId: poolConnection.id
          }
        });
      }

      return tx.workspace.findUnique({
        where: {
          id: workspace.id
        }
      });
    });
  }

  const baseSlug = slugPart(user.email.split("@")[0] || user.id);
  const workspaceId = `workspace_${user.id}`;
  const connectionId = `connection_${user.id}`;
  const campaignId = `campaign_${user.id}`;
  const workspaceSlug = `${baseSlug || "client"}-${user.id.slice(-6)}`;
  const campaignSlug = `join-${user.id.slice(-8)}`;
  const templates = createDefaultTemplates(campaignId);

  return db.$transaction(async (tx: any) => {
    const workspace = await tx.workspace.create({
      data: {
        id: workspaceId,
        name: user.fullName ? `ההגרלות של ${user.fullName}` : "Magic Flow",
        slug: workspaceSlug,
        ownerName: user.fullName ?? user.name ?? user.email,
        ownerEmail: user.email,
        accountStatus: "active",
        maxCampaigns: 1,
        phoneNumber: null,
        whatsappStatus: "DISCONNECTED",
        googleContactTemplate: "{{name}}+בוט",
        numberPoolStatus: "waiting"
      }
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER"
      }
    });

    const poolConnection = await assignPoolConnection(tx, workspace.id, user.id);
    const fallbackConnection =
      poolConnection ??
      (await tx.whatsAppConnection.create({
        data: {
          id: connectionId,
          workspaceId: workspace.id,
          provider: "official_business",
          label: "המספר בהכנה",
          status: "idle",
          maxTenants: 0,
          sessionKey: `waiting_session_${user.id}`
        }
      }));

    const campaign = await tx.campaign.create({
      data: {
        id: campaignId,
        workspaceId: workspace.id,
        connectionId: fallbackConnection.id,
        name: "ההגרלה הראשונה",
        slug: campaignSlug,
        type: "REFERRAL",
        triggerWord: "הגרלה",
        drawWeightMode: "STORED_TICKETS",
        contactTagName: "Magic_Flow",
        statusCommandAliases: Array.from(DEFAULT_STATUS_COMMANDS),
        isActive: true
      }
    });

    await tx.messageTemplate.createMany({
      data: templates.map((template) => ({
        id: template.id,
        campaignId: campaign.id,
        type: templateType(template.key),
        label: template.label,
        content: template.value,
        isEnabled: template.isEnabled,
        mediaUrl: template.mediaUrl,
        mediaType: template.mediaType,
        interactiveType: template.interactive?.kind ?? "NONE",
        interactiveData: template.interactive ?? null
      })),
      skipDuplicates: true
    });

    return workspace;
  });
}
