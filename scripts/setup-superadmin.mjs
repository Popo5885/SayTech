import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const email = process.env.SUPERADMIN_EMAIL;
const password = process.env.SUPERADMIN_INITIAL_PASSWORD;
const normalizedEmail = email?.toLowerCase();
const workspaceSlug = process.env.SUPERADMIN_WORKSPACE_SLUG ?? "shlomo-popovich";
const workspaceId = "workspace_superadmin";
const connectionId = "connection_superadmin";
const campaignId = "campaign_superadmin_first";
const now = new Date();

if (!email || !password) {
  console.error("Missing SUPERADMIN_EMAIL or SUPERADMIN_INITIAL_PASSWORD in .env");
  process.exit(1);
}

const prisma = new PrismaClient();

const user = await prisma.user.upsert({
  where: { email: normalizedEmail },
  update: {
    fullName: "שלמה פופוביץ",
    name: "שלמה פופוביץ",
    passwordHash: hashPassword(password),
    accountStatus: "active",
    globalRole: "SUPER_ADMIN",
    approvedAt: now
  },
  create: {
    email: normalizedEmail,
    fullName: "שלמה פופוביץ",
    name: "שלמה פופוביץ",
    passwordHash: hashPassword(password),
    accountStatus: "active",
    globalRole: "SUPER_ADMIN",
    approvedAt: now
  }
});

const workspace = await prisma.workspace.upsert({
  where: { slug: workspaceSlug },
  update: {
    name: "שלמה פופוביץ",
    ownerName: "שלמה פופוביץ",
    ownerEmail: normalizedEmail,
    accountStatus: "active",
    maxCampaigns: 10,
    phoneNumber: "+972542466340"
  },
  create: {
    id: workspaceId,
    name: "שלמה פופוביץ",
    slug: workspaceSlug,
    ownerName: "שלמה פופוביץ",
    ownerEmail: normalizedEmail,
    accountStatus: "active",
    maxCampaigns: 10,
    phoneNumber: "+972542466340"
  }
});

await prisma.workspaceMember.upsert({
  where: {
    workspaceId_userId: {
      workspaceId: workspace.id,
      userId: user.id
    }
  },
  update: { role: "OWNER" },
  create: {
    workspaceId: workspace.id,
    userId: user.id,
    role: "OWNER"
  }
});

const connection = await prisma.whatsAppConnection.upsert({
  where: { sessionKey: "session_superadmin" },
  update: {
    workspaceId: workspace.id,
    provider: "unofficial_qr",
    label: "חיבור WhatsApp ראשי",
    maxTenants: 3
  },
  create: {
    id: connectionId,
    workspaceId: workspace.id,
    provider: "unofficial_qr",
    label: "חיבור WhatsApp ראשי",
    sessionKey: "session_superadmin",
    maxTenants: 3
  }
});

const campaign = await prisma.campaign.upsert({
  where: { slug: `${workspaceSlug}-first-draw` },
  update: {
    workspaceId: workspace.id,
    connectionId: connection.id,
    name: "ההגרלה הראשונה",
    triggerWord: "היי, אשמח להצטרף להגרלה",
    contactTagName: "Magic_Flow",
    statusCommandAliases: ["סטטוס", "כמה כרטיסים יש לי", "כרטיסים"]
  },
  create: {
    id: campaignId,
    workspaceId: workspace.id,
    connectionId: connection.id,
    name: "ההגרלה הראשונה",
    slug: `${workspaceSlug}-first-draw`,
    type: "REFERRAL",
    triggerWord: "היי, אשמח להצטרף להגרלה",
    contactTagName: "Magic_Flow",
    statusCommandAliases: ["סטטוס", "כמה כרטיסים יש לי", "כרטיסים"]
  }
});

const templates = [
  {
    type: "JOIN_WHATSAPP_PROMPT",
    label: "טקסט פתיחה לקישור WhatsApp",
    content: "היי, אשמח להצטרף ל{{campaign_name}}. הגעתי דרך {{ref}}."
  },
  {
    type: "WELCOME",
    label: "הודעת פתיחה",
    content: "ברוכים הבאים ל{{campaign_name}}. איך קוראים לך?"
  },
  {
    type: "SAVE_CONTACT_PROMPT",
    label: "שמירת איש קשר",
    content: "כדי לקבל עדכונים, שמרו את איש הקשר ואז כתבו שמרתי."
  },
  {
    type: "LINK",
    label: "קישור אישי",
    content: "מעולה {{name}}. זה הקישור האישי שלך: {{link}}"
  },
  {
    type: "STATUS",
    label: "בדיקת כרטיסים",
    content: "{{name}}, יש לך {{tickets}} כרטיסים בהגרלה."
  },
  {
    type: "WINNER",
    label: "הודעת זכייה",
    content: "מזל טוב {{name}}. נבחרת כזוכה בהגרלה."
  }
];

for (const template of templates) {
  await prisma.messageTemplate.upsert({
    where: {
      campaignId_type: {
        campaignId: campaign.id,
        type: template.type
      }
    },
    update: template,
    create: {
      ...template,
      campaignId: campaign.id
    }
  });
}

await prisma.$disconnect();
console.log(`SuperAdmin is ready: ${email}`);
