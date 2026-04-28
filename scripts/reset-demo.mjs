import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoCampaignIds = ["campaign_spring"];
const demoWorkspaceIds = ["workspace_demo"];
const demoConnectionIds = ["connection_demo"];
const demoSlugs = ["spring-lottery", "lucky-lemon"];

await prisma.$transaction([
  prisma.winnerDraw.deleteMany({ where: { campaignId: { in: demoCampaignIds } } }),
  prisma.messageLog.deleteMany({ where: { campaignId: { in: demoCampaignIds } } }),
  prisma.contactSyncLedger.deleteMany({ where: { lastCampaignId: { in: demoCampaignIds } } }),
  prisma.participant.deleteMany({ where: { campaignId: { in: demoCampaignIds } } }),
  prisma.messageTemplate.deleteMany({ where: { campaignId: { in: demoCampaignIds } } }),
  prisma.campaign.deleteMany({
    where: {
      OR: [{ id: { in: demoCampaignIds } }, { slug: { in: demoSlugs } }]
    }
  }),
  prisma.workspaceContactCard.deleteMany({ where: { workspaceId: { in: demoWorkspaceIds } } }),
  prisma.workspaceConnectionAssignment.deleteMany({
    where: {
      OR: [
        { workspaceId: { in: demoWorkspaceIds } },
        { connectionId: { in: demoConnectionIds } }
      ]
    }
  }),
  prisma.whatsAppConnection.deleteMany({
    where: {
      OR: [{ id: { in: demoConnectionIds } }, { sessionKey: "session_demo" }]
    }
  }),
  prisma.workspace.deleteMany({
    where: {
      OR: [{ id: { in: demoWorkspaceIds } }, { slug: { in: demoSlugs } }]
    }
  })
]);

await prisma.$disconnect();
console.log("Demo data was removed. Keep or create SuperAdmin with npm run setup:superadmin.");
