import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encryptSecret } from "@lottery/core";
import { prisma } from "@lottery/db";
import { auth } from "../../auth";
import { AUTH_SETTING_KEYS, getAuthFeatureSettings, setAuthFeatureSetting } from "../../lib/auth-settings";
import { ownerEmail, sendSystemEmail } from "../../lib/email";
import { getSmtpAdminSettings, saveSmtpSettings } from "../../lib/email-settings";
import { DEFAULT_GOOGLE_CLIENT_ID, getGoogleOAuthAdminSettings, saveGoogleOAuthSettings } from "../../lib/google-settings";
import { createVerificationCode, hashPassword, hashVerificationCode, isEnglishPassword } from "../../lib/password";
import { normalizeIsraeliPhone } from "../../lib/phone";
import { provisionWorkspaceForUser } from "../../lib/provisioning";
import { AdminMobileMenu } from "../../components/admin-mobile-menu";
import { DatabaseErrorState } from "../../components/database-error-state";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { safeDbRead } from "../../lib/safe-db";

const db = prisma as any;

export const runtime = "nodejs";

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  active: "פעיל",
  suspended: "מושהה",
  rejected: "נדחה"
};

async function requireAdminUser() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session || email !== ownerEmail().toLowerCase()) {
    redirect("/dashboard");
  }

  return session.user as any;
}

async function sendAccountSetupEmail(user: any) {
  const code = createVerificationCode();

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  });

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  await sendSystemEmail({
    to: user.email,
    subject: "הוגדר לך חשבון Magic Flow",
    unsubscribeUrl: `${baseUrl}/unsubscribe/${user.unsubscribeToken}`,
    html: `<h1>החשבון שלך מוכן</h1><p>צוות Magic Flow פתח עבורך חשבון. כדי לבחור סיסמה ולהתחיל לעבוד, השתמש בקוד הבא:</p><p style="font-size:28px;font-weight:900;letter-spacing:4px" dir="ltr">${code}</p><p><a href="${baseUrl}/reset-password?email=${encodeURIComponent(user.email)}">בחירת סיסמה וכניסה למערכת</a></p><p>הקוד תקף ל-30 דקות.</p>`
  });
}

async function approveUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "active", approvedAt: new Date(), rejectedAt: null, suspendedAt: null }
  });

  await provisionWorkspaceForUser(user.id);
  await sendSystemEmail({
    to: user.email,
    subject: "החשבון שלך אושר",
    unsubscribeUrl: `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`,
    html: `<h1>חדשות טובות</h1><p>צוות Magic Flow אישר את החשבון שלך. אפשר להיכנס למערכת ולהתחיל לעבוד.</p><p><a href="${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/login">כניסה למערכת</a></p>`
  });
  revalidatePath("/admin");
}

async function rejectUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "rejected", rejectedAt: new Date() }
  });

  await sendSystemEmail({
    to: user.email,
    subject: "עדכון לגבי בקשת ההרשמה",
    unsubscribeUrl: `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`,
    html: `<h1>בקשת ההרשמה לא אושרה כרגע</h1><p>אפשר לפנות לצוות Magic Flow לפרטים נוספים.</p>`
  });
  revalidatePath("/admin");
}

async function createCustomerAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const activateNow = formData.get("activateNow") === "1";

  if (!fullName || !email) {
    redirect("/admin");
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      fullName,
      name: fullName,
      phone: phone || null,
      accountStatus: activateNow ? "active" : "pending",
      approvedAt: activateNow ? new Date() : null,
      rejectedAt: null,
      suspendedAt: null
    },
    create: {
      email,
      fullName,
      name: fullName,
      phone: phone || null,
      accountStatus: activateNow ? "active" : "pending",
      approvedAt: activateNow ? new Date() : null
    }
  });

  if (activateNow) {
    await provisionWorkspaceForUser(user.id);
  }

  await sendAccountSetupEmail(user);
  await db.adminAuditLog.create({
    data: {
      actorUserId: (await auth())?.user?.id,
      action: activateNow ? "ADMIN_CREATED_ACTIVE_CUSTOMER" : "ADMIN_CREATED_PENDING_CUSTOMER",
      targetType: "User",
      targetId: user.id,
      metadata: { email }
    }
  });
  revalidatePath("/admin");
}

async function suspendUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const target = await db.user.findUnique({ where: { id: userId }, select: { email: true, globalRole: true } });

  if (target?.email?.toLowerCase() === (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase()) {
    redirect("/admin?error=subadmin-protected#customers");
  }

  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "suspended", suspendedAt: new Date() }
  });

  await db.workspace.updateMany({
    where: { ownerEmail: user.email },
    data: { accountStatus: "suspended" }
  });
  await db.adminAuditLog.create({
    data: { actorUserId: (await auth())?.user?.id, action: "CUSTOMER_SUSPENDED", targetType: "User", targetId: user.id }
  });
  revalidatePath("/admin");
  redirect("/admin?saved=user-suspended#customers");
}

async function activateUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "active", approvedAt: new Date(), suspendedAt: null, rejectedAt: null }
  });

  await db.workspace.updateMany({
    where: { ownerEmail: user.email },
    data: { accountStatus: "active" }
  });
  await provisionWorkspaceForUser(user.id);
  revalidatePath("/admin");
  redirect("/admin?saved=user-activated#customers");
}

async function changeUserPasswordAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId || !isEnglishPassword(password)) {
    redirect("/admin?error=password#customers");
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(password) }
  });
  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SUPERADMIN_CHANGED_USER_PASSWORD",
      targetType: "User",
      targetId: userId
    }
  });
  revalidatePath("/admin");
  redirect("/admin?saved=password#customers");
}

async function adjustContactQuotaAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const mode = String(formData.get("mode") ?? "packs");
  const rawAmount = Math.max(1, Number(formData.get("amount") ?? 1));
  const amount = mode === "contacts" ? rawAmount : rawAmount * 100;
  const priceCents = mode === "contacts" ? 0 : rawAmount * 500;

  if (!workspaceId || amount <= 0) {
    redirect("/admin#customers");
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      contactBotExtraQuota: {
        increment: amount
      }
    }
  });
  await db.contactBotQuotaAdjustment.create({
    data: {
      workspaceId,
      amount,
      priceCents,
      note: mode === "contacts" ? "הגדלה ידנית מהממשק" : `תוספת ${rawAmount} חבילות`,
      createdByUserId: admin.id
    }
  });
  await db.contactBotUpgradeRequest.updateMany({
    where: { workspaceId, status: "open" },
    data: { status: "approved", closedAt: new Date() }
  });
  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "CONTACT_BOT_QUOTA_ADJUSTED",
      targetType: "Workspace",
      targetId: workspaceId,
      metadata: { amount, priceCents }
    }
  });
  revalidatePath("/admin");
  redirect("/admin?saved=quota#customers");
}

async function convertLeadAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const leadId = String(formData.get("leadId") ?? "");
  const approve = formData.get("approve") === "1";
  const lead = await db.contactLead.findUnique({ where: { id: leadId } });

  if (!lead) {
    return;
  }

  const user = await db.user.upsert({
    where: { email: lead.email.toLowerCase() },
    update: {
      fullName: lead.fullName,
      name: lead.fullName,
      phone: lead.phone,
      accountStatus: approve ? "active" : "pending",
      approvedAt: approve ? new Date() : null
    },
    create: {
      email: lead.email.toLowerCase(),
      fullName: lead.fullName,
      name: lead.fullName,
      phone: lead.phone,
      accountStatus: approve ? "active" : "pending",
      approvedAt: approve ? new Date() : null
    }
  });

  if (approve) {
    await provisionWorkspaceForUser(user.id);
  }

  await db.contactLead.update({
    where: { id: leadId },
    data: { status: "converted", convertedUserId: user.id }
  });
  await sendAccountSetupEmail(user);
  revalidatePath("/admin");
}

async function closeLeadAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const leadId = String(formData.get("leadId") ?? "");
  await db.contactLead.update({
    where: { id: leadId },
    data: { status: "closed", closedAt: new Date() }
  });
  revalidatePath("/admin");
}

async function viewWorkspaceAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace) {
    redirect("/admin");
  }

  (await cookies()).set("admin_workspace_id", workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4
  });
  await db.adminAuditLog.create({
    data: {
      actorUserId: (await auth())?.user?.id,
      action: "ADMIN_VIEW_WORKSPACE",
      targetType: "Workspace",
      targetId: workspaceId
    }
  });
  redirect("/dashboard");
}

async function viewWorkspaceConnectionsAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace) {
    redirect("/admin");
  }

  (await cookies()).set("admin_workspace_id", workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4
  });
  await db.adminAuditLog.create({
    data: {
      actorUserId: (await auth())?.user?.id,
      action: "ADMIN_VIEW_WORKSPACE_CONNECTIONS",
      targetType: "Workspace",
      targetId: workspaceId
    }
  });
  redirect("/dashboard/connections");
}

async function createConnectionAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const label = String(formData.get("label") ?? "חיבור WhatsApp").trim();
  const phoneNumber = normalizeIsraeliPhone(String(formData.get("phoneNumber") ?? "").trim());
  const provider = String(formData.get("provider") ?? "official_business");
  const maxTenants = Math.max(1, Number(formData.get("maxTenants") ?? 3));
  const officialPhoneNumberId = String(formData.get("officialPhoneNumberId") ?? "").trim();
  const officialWabaId = String(formData.get("officialWabaId") ?? "").trim();
  const officialAccessToken = String(formData.get("officialAccessToken") ?? "").trim();
  const officialWebhookVerifyToken = String(formData.get("officialWebhookVerifyToken") ?? "").trim();

  if (!workspaceId) {
    redirect("/admin");
  }

  if (provider === "official_business" && !phoneNumber) {
    redirect("/admin?error=connection-phone#connections");
  }

  if (
    provider === "official_business" &&
    (officialAccessToken || officialWebhookVerifyToken) &&
    process.env.NODE_ENV === "production" &&
    !process.env.WORKSPACE_TOKEN_ENCRYPTION_KEY
  ) {
    redirect("/admin?error=encryption-key#connections");
  }

  await db.whatsAppConnection.create({
    data: {
      workspaceId,
      provider,
      label,
      phoneNumber,
      status: phoneNumber ? "connected" : "idle",
      maxTenants,
      officialPhoneNumberId: provider === "official_business" ? officialPhoneNumberId || null : null,
      officialWabaId: provider === "official_business" ? officialWabaId || null : null,
      officialAccessTokenEncrypted:
        provider === "official_business" && officialAccessToken ? encryptSecret(officialAccessToken) : null,
      officialWebhookVerifyTokenEncrypted:
        provider === "official_business" && officialWebhookVerifyToken ? encryptSecret(officialWebhookVerifyToken) : null,
      sessionKey: `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }
  });
  revalidatePath("/admin");
  redirect("/admin?saved=connection#connections");
}

async function createAutomationAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "") || null;
  const triggerKind = String(formData.get("triggerKind") ?? "fixed_time");
  const name = String(formData.get("name") ?? "אוטומציה חדשה").trim();
  const message = String(formData.get("message") ?? "").trim();
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const delayMinutesRaw = String(formData.get("delayMinutes") ?? "");

  if (!message) {
    redirect("/admin");
  }

  await db.automationRule.create({
    data: {
      workspaceId,
      name,
      triggerKind,
      message,
      scheduledAt: triggerKind === "fixed_time" && scheduledAtRaw ? new Date(scheduledAtRaw) : null,
      delayMinutes: triggerKind === "delay_after_join" && delayMinutesRaw ? Number(delayMinutesRaw) : null,
      createdByUserId: admin.id
    }
  });
  revalidatePath("/admin");
}

async function createNewsletterDraftAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "active_users");

  if (!subject || !body) {
    redirect("/admin");
  }

  await db.emailBroadcast.create({
    data: { subject, body, audience, status: "draft", createdById: admin.id }
  });
  revalidatePath("/admin");
}

async function createBillingAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const status = String(formData.get("status") ?? "draft");

  if (!workspaceId || !label || !amount) {
    redirect("/admin");
  }

  await db.billingRecord.create({
    data: {
      workspaceId,
      label,
      amountCents: Math.round(amount * 100),
      status,
      receiptNumber: status === "paid" ? `MF-${Date.now()}` : null,
      paidAt: status === "paid" ? new Date() : null,
      createdByUserId: admin.id
    }
  });
  revalidatePath("/admin");
}

async function saveSiteContentAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const entries = ["landing_title", "landing_subtitle", "landing_price"].map((key) => ({
    key,
    value: String(formData.get(key) ?? "").trim(),
    updatedByUserId: admin.id
  }));

  await Promise.all(
    entries
      .filter((entry) => entry.value)
      .map((entry) =>
        db.siteSetting.upsert({
          where: { key: entry.key },
          update: { value: entry.value, updatedByUserId: entry.updatedByUserId },
          create: entry
        })
      )
  );
  revalidatePath("/admin");
  revalidatePath("/");
}

async function saveAuthSettingsAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const googleLoginEnabled = formData.get("googleLoginEnabled") === "on";
  const whatsappLoginEnabled = formData.get("whatsappLoginEnabled") === "on";
  const whatsappManualCodeEnabled = formData.get("whatsappManualCodeEnabled") === "on";

  await Promise.all([
    setAuthFeatureSetting(
      AUTH_SETTING_KEYS.googleLoginEnabled,
      googleLoginEnabled,
      admin.id
    ),
    setAuthFeatureSetting(
      AUTH_SETTING_KEYS.whatsappLoginEnabled,
      whatsappLoginEnabled,
      admin.id
    ),
    setAuthFeatureSetting(
      AUTH_SETTING_KEYS.whatsappManualCodeEnabled,
      whatsappManualCodeEnabled,
      admin.id
    )
  ]);

  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "AUTH_SETTINGS_UPDATED",
      targetType: "SiteSetting",
      metadata: {
        googleLoginEnabled,
        whatsappLoginEnabled,
        whatsappManualCodeEnabled
      }
    }
  });
  revalidatePath("/admin");
  revalidatePath("/login");
  revalidatePath("/register");

  const nextSettings = await getAuthFeatureSettings();
  const missing: string[] = [];

  if (googleLoginEnabled && !nextSettings.googleConfigured) {
    missing.push("google-secret");
  }

  if (whatsappLoginEnabled && !nextSettings.whatsappSenderConfigured && !whatsappManualCodeEnabled) {
    missing.push("whatsapp-sender");
  }

  redirect(`/admin?saved=auth${missing.length ? `&missing=${missing.join(",")}` : ""}#auth-settings`);
}

async function saveGoogleOAuthSettingsAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const clientId = String(formData.get("googleClientId") ?? "").trim() || DEFAULT_GOOGLE_CLIENT_ID;
  const clientSecret = String(formData.get("googleClientSecret") ?? "").trim();
  const redirectUri = String(formData.get("googleRedirectUri") ?? "").trim();

  if (!clientId) {
    redirect("/admin?error=google-oauth#auth-settings");
  }

  try {
    await saveGoogleOAuthSettings({ clientId, clientSecret, redirectUri }, admin.id);
  } catch (error) {
    console.error("[admin:google-oauth-settings-failed]", error);
    redirect("/admin?error=google-oauth#auth-settings");
  }

  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "GOOGLE_OAUTH_SETTINGS_UPDATED",
      targetType: "SiteSetting",
      metadata: {
        clientId,
        redirectUri,
        secretUpdated: Boolean(clientSecret)
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/login");
  revalidatePath("/register");
  redirect("/admin?saved=google-oauth#auth-settings");
}

async function saveSmtpSettingsAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const host = String(formData.get("smtpHost") ?? "").trim() || "smtp.gmail.com";
  const port = Number(formData.get("smtpPort") ?? 465);
  const user = String(formData.get("smtpUser") ?? "").trim().toLowerCase();
  const from = String(formData.get("smtpFrom") ?? "").trim().toLowerCase() || user;
  const pass = String(formData.get("smtpPass") ?? "").trim();
  const secure = formData.get("smtpSecure") === "on";

  if (!host || !user || !from || !Number.isFinite(port)) {
    redirect("/admin?error=smtp-missing#smtp-settings");
  }

  try {
    await saveSmtpSettings({ host, port, user, from, pass, secure }, admin.id);
  } catch (error) {
    console.error("[admin:smtp-settings-failed]", error);
    redirect("/admin?error=smtp-save#smtp-settings");
  }

  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SMTP_SETTINGS_UPDATED",
      targetType: "SiteSetting",
      metadata: {
        host,
        port,
        user,
        from,
        secure,
        passUpdated: Boolean(pass)
      }
    }
  });

  revalidatePath("/admin");
  const status = await getSmtpAdminSettings();
  redirect(`/admin?saved=smtp${status.missing.length ? `&missing=${status.missing.join(",")}` : ""}#smtp-settings`);
}

async function sendTestEmailAction() {
  "use server";

  const admin = await requireAdminUser();
  const sent = await sendSystemEmail({
    to: ownerEmail(),
    subject: "בדיקת מייל מ-Magic Flow",
    html: `<h1>בדיקת מייל הצליחה</h1><p>הגדרות SMTP במערכת פעילות. אפשר לשלוח פניות, איפוסי סיסמה ועדכונים.</p>`
  });

  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: sent ? "SMTP_TEST_EMAIL_SENT" : "SMTP_TEST_EMAIL_FAILED",
      targetType: "SiteSetting",
      metadata: {
        to: ownerEmail()
      }
    }
  });

  revalidatePath("/admin");
  redirect(sent ? "/admin?saved=smtp-test#smtp-settings" : "/admin?error=smtp-test#smtp-settings");
}

const PRIMARY_SUPER_ADMIN = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();

async function createSubAdminAction(formData: FormData) {
  "use server";

  const actor = await requireAdminUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !fullName || !isEnglishPassword(password)) {
    redirect("/admin?error=subadmin-invalid#team");
  }

  if (email === PRIMARY_SUPER_ADMIN) {
    redirect("/admin?error=subadmin-protected#team");
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      fullName,
      name: fullName,
      passwordHash: hashPassword(password),
      globalRole: "SUB_ADMIN",
      accountStatus: "active",
      approvedAt: new Date()
    },
    create: {
      email,
      fullName,
      name: fullName,
      passwordHash: hashPassword(password),
      globalRole: "SUB_ADMIN",
      accountStatus: "active",
      approvedAt: new Date()
    }
  });

  await db.adminAuditLog.create({
    data: {
      actorUserId: actor.id,
      action: "SUB_ADMIN_CREATED",
      targetType: "User",
      targetId: user.id,
      metadata: { email }
    }
  });
  revalidatePath("/admin");
  redirect("/admin?saved=subadmin#team");
}

async function deleteSubAdminAction(formData: FormData) {
  "use server";

  const actor = await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    redirect("/admin#team");
  }

  if (user.email.toLowerCase() === PRIMARY_SUPER_ADMIN) {
    redirect("/admin?error=subadmin-protected#team");
  }

  if (user.globalRole === "SUPER_ADMIN") {
    redirect("/admin?error=subadmin-protected#team");
  }

  await db.user.update({
    where: { id: userId },
    data: { globalRole: "USER" }
  });
  await db.adminAuditLog.create({
    data: {
      actorUserId: actor.id,
      action: "SUB_ADMIN_DEMOTED",
      targetType: "User",
      targetId: userId,
      metadata: { email: user.email }
    }
  });
  revalidatePath("/admin");
  redirect("/admin?saved=subadmin-removed#team");
}

async function setManualWhatsAppLoginCodeAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  const expiresMinutes = Math.max(5, Math.min(120, Number(formData.get("expiresMinutes") ?? 30)));

  if (!phone || !/^\d{4,8}$/.test(code)) {
    redirect("/admin?error=wa-code#auth-settings");
  }

  const user = await db.user.findFirst({
    where: {
      phone,
      accountStatus: "active"
    },
    select: {
      id: true
    }
  });

  if (!user) {
    redirect("/admin?error=wa-login-user#auth-settings");
  }

  await db.whatsAppLoginCode.create({
    data: {
      phone,
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000)
    }
  });
  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "MANUAL_WHATSAPP_LOGIN_CODE_SET",
      targetType: "User",
      targetId: user.id,
      metadata: {
        phone,
        expiresMinutes
      }
    }
  });
  revalidatePath("/admin");
  redirect("/admin?saved=wa-code#auth-settings");
}

function Field({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500";
}

function selectClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500";
}

function textAreaClass() {
  return "min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500";
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; saved?: string; missing?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const sessionEmail = session.user?.email?.toLowerCase();
  const adminEmail = ownerEmail().toLowerCase();

  if (sessionEmail !== adminEmail) {
    redirect("/dashboard");
  }

  const adminDataResult = await safeDbRead("admin:overview", async () => {
    const [
      pendingUsers,
      leads,
      activeCount,
      customers,
      workspaces,
      connections,
      automationRules,
      broadcasts,
      billingRecords,
      siteSettings,
      upgradeRequests,
      subAdmins
    ] = await Promise.all([
      db.user.findMany({ where: { accountStatus: "pending" }, orderBy: { createdAt: "desc" } }),
      db.contactLead.findMany({ where: { status: "open" }, orderBy: { createdAt: "desc" } }),
      db.user.count({ where: { accountStatus: "active" } }),
      db.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      db.workspace.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      db.whatsAppConnection.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { workspace: true } }),
      db.automationRule.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { workspace: true } }),
      db.emailBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      db.billingRecord.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { workspace: true } }),
      db.siteSetting.findMany(),
      db.contactBotUpgradeRequest.findMany({ where: { status: "open" }, orderBy: { createdAt: "desc" }, take: 50, include: { workspace: true } }),
      db.user.findMany({ where: { globalRole: { in: ["SUB_ADMIN", "SUPER_ADMIN"] } }, orderBy: { createdAt: "asc" } })
    ]);

    return {
      activeCount,
      automationRules,
      billingRecords,
      broadcasts,
      connections,
      customers,
      leads,
      pendingUsers,
      siteSettings,
      subAdmins,
      upgradeRequests,
      workspaces
    };
  });

  if (!adminDataResult.ok) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] px-4 py-10">
        <DatabaseErrorState retryHref="/admin" />
      </main>
    );
  }

  const {
    activeCount,
    automationRules,
    billingRecords,
    broadcasts,
    connections,
    customers,
    leads,
    pendingUsers,
    siteSettings,
    subAdmins,
    upgradeRequests,
    workspaces
  } = adminDataResult.data;
  const workspaceByEmail = new Map<string, any>(
    workspaces
      .filter((workspace: any) => workspace.ownerEmail)
      .map((workspace: any) => [workspace.ownerEmail, workspace] as [string, any])
  );
  const siteContent = new Map<string, string>(
    siteSettings.map((setting: any) => [setting.key, String(setting.value)] as [string, string])
  );
  const authSettings = await getAuthFeatureSettings();
  const googleOAuthSettings = await getGoogleOAuthAdminSettings();
  const smtpSettings = await getSmtpAdminSettings();
  const missingCodes = new Set((params?.missing ?? "").split(",").filter(Boolean));
  const operationalChecks = [
    {
      label: "Auth",
      value: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ? "מוגדר" : "Fallback פעיל",
      ok: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      note: "מומלץ להגדיר AUTH_SECRET קבוע ב-Railway."
    },
    {
      label: "Google Login",
      value: authSettings.googleLoginEnabled
        ? "פעיל"
        : authSettings.googleConfigured
          ? "מוגדר וכבוי"
          : "חסר Client Secret",
      ok: authSettings.googleLoginEnabled,
      note: "נדרש Google Client Secret. אפשר להגדיר אותו באזור Google OAuth בממשק או דרך סביבת השרת."
    },
    {
      label: "WhatsApp Login",
      value: authSettings.whatsappLoginEnabled
        ? authSettings.whatsappSenderConfigured
          ? "פעיל ושולח"
          : authSettings.whatsappManualCodeEnabled
            ? "פעיל ידני"
            : "פעיל ללא שולח"
        : "כבוי",
      ok: authSettings.whatsappLoginEnabled,
      note: "אפשר לכבות בכל רגע. שליחת קוד דורשת WhatsApp Official או קוד ידני מהממשק."
    },
    {
      label: "SMTP",
      value: smtpSettings.configured ? "פעיל" : `חסר ${smtpSettings.missing.join(", ")}`,
      ok: smtpSettings.configured,
      note: "נדרש לשליחת פניות, איפוסי סיסמה, אישורי חשבון וניוזלטרים."
    },
    {
      label: "הצפנת טוקנים",
      value: process.env.WORKSPACE_TOKEN_ENCRYPTION_KEY ? "מוגדר" : "חסר",
      ok: Boolean(process.env.WORKSPACE_TOKEN_ENCRYPTION_KEY),
      note: "חובה לשמירת טוקנים של WhatsApp Official בפרודקשן."
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[32px] bg-slate-950 p-6 text-white md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-cyan-200">מערכת ניהול</p>
              <h1 className="mt-3 text-4xl font-black">ניהול Magic Flow</h1>
            </div>
            <AdminMobileMenu />
          </div>
          <p className="mt-3 text-slate-300">לקוחות, חיבורים, אוטומציות, ניוזלטרים, קבלות ותוכן האתר במקום אחד.</p>
          <p className="mt-5 text-sm text-slate-400">מייל מנהל: <span dir="ltr">{ownerEmail()}</span></p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-blue-700">מרכז תפעול מהיר</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">כל פעולות הניהול החשובות</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["צוות ניהול", "#team", "Sub-Admins עם הרשאות מוגבלות"],
                ["לקוחות", "#customers", "אישור, השהיה וכניסה לממשק לקוח"],
                ["חיבורי WhatsApp", "#connections", "הוספת Official או כלי צוות"],
                ["כניסות", "#auth-settings", "Google ו-WhatsApp OTP"],
                ["מיילים", "#smtp-settings", "SMTP, App Password ומייל בדיקה"],
                ["אוטומציות", "#automations", "שליחה בזמן קבוע או אחרי הצטרפות"],
                ["קבלות", "#billing", "תשלומים, קבלות ותוספים"]
              ].map(([title, href, description]) => (
                <a className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50" href={href} key={title}>
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-emerald-700">בדיקת תצורת שרת</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">מה צריך להיות פעיל בפרודקשן</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {operationalChecks.map((check) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={check.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">{check.label}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${check.ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {check.value}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{check.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {params?.error === "encryption-key" ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900">
            כדי לשמור Access Token של WhatsApp Official צריך להגדיר ב-Railway את
            <span className="mx-1 rounded-lg bg-white px-2 py-1" dir="ltr">WORKSPACE_TOKEN_ENCRYPTION_KEY</span>
            ואז לנסות שוב. זה מונע שמירת טוקנים ללא הצפנה.
          </div>
        ) : null}

        {params?.error === "connection-phone" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            כדי להוסיף חיבור WhatsApp צריך להזין מספר תקין בפורמט בינלאומי, למשל <span dir="ltr">+972501234567</span>.
          </div>
        ) : null}

        {params?.saved === "connection" ? (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-900">
            החיבור נשמר בהצלחה. אם זה חיבור רשמי, ודא שגם ה-Webhook של Meta מפנה לכתובת השרת.
          </div>
        ) : null}

        {params?.error === "password" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            הסיסמה חייבת להיות באנגלית בלבד: אותיות באנגלית ומספרים, לפחות 8 תווים.
          </div>
        ) : null}

        {params?.saved === "password" ? (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-900">
            הסיסמה עודכנה בהצלחה.
          </div>
        ) : null}

        {params?.saved === "user-suspended" ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900">
            המשתמש ננעל. בכניסה הבאה יוצג לו שהחשבון נעול ושעליו לפנות לתמיכה.
          </div>
        ) : null}

        {params?.saved === "user-activated" ? (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-900">
            המשתמש הופעל ושוחרר לכניסה למערכת.
          </div>
        ) : null}

        {params?.saved === "auth" ? (
          <div className={`rounded-[28px] border p-5 text-sm font-bold leading-7 ${
            missingCodes.has("google-secret") || missingCodes.has("whatsapp-sender")
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}>
            הגדרות הכניסה נשמרו.
            {missingCodes.has("google-secret") ? (
              <span className="block">כדי ש-Google יופיע ללקוחות צריך למלא Google Client Secret באזור Google OAuth כאן בממשק, או להגדיר <span dir="ltr">GOOGLE_CLIENT_SECRET</span> בשרת.</span>
            ) : null}
            {missingCodes.has("whatsapp-sender") ? (
              <span className="block">כדי לשלוח קודי WhatsApp אוטומטית צריך לחבר שולח WhatsApp Official או להפעיל קוד ידני מהממשק.</span>
            ) : null}
          </div>
        ) : null}

        {params?.saved === "google-oauth" ? (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-900">
            הגדרות Google OAuth נשמרו. אם הפעלת Google בהגדרות הכניסה ויש Client Secret תקין, הכפתור יופיע ללקוחות.
          </div>
        ) : null}

        {params?.error === "google-oauth" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            לא ניתן לשמור את Google OAuth. מלא Client ID תקין. אם שומרים Secret בפרודקשן, נדרש גם WORKSPACE_TOKEN_ENCRYPTION_KEY.
          </div>
        ) : null}

        {params?.saved === "smtp" ? (
          <div className={`rounded-[28px] border p-5 text-sm font-bold leading-7 ${
            smtpSettings.configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}>
            הגדרות המייל נשמרו.
            {!smtpSettings.configured ? (
              <span className="block">עדיין חסר: <span dir="ltr">{smtpSettings.missing.join(", ")}</span>.</span>
            ) : (
              <span className="block">אפשר לשלוח עכשיו מייל בדיקה ולוודא שהוא מגיע.</span>
            )}
          </div>
        ) : null}

        {params?.saved === "smtp-test" ? (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-900">
            מייל בדיקה נשלח לכתובת המנהל.
          </div>
        ) : null}

        {params?.error === "smtp-test" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            מייל הבדיקה לא נשלח. בדוק את SMTP_PASS, את כתובת המייל ואת הרשאות Gmail App Password.
          </div>
        ) : null}

        {params?.error === "smtp-missing" || params?.error === "smtp-save" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            לא ניתן לשמור את הגדרות המייל. מלא Host, Port, User ו-From. אם שמרת סיסמה בפרודקשן, נדרש גם WORKSPACE_TOKEN_ENCRYPTION_KEY.
          </div>
        ) : null}

        {params?.saved === "wa-code" ? (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-900">
            קוד הכניסה ב-WhatsApp נשמר למספר שבחרת.
          </div>
        ) : null}

        {params?.error === "wa-code" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            צריך להזין מספר טלפון תקין וקוד בן 4-8 ספרות.
          </div>
        ) : null}

        {params?.error === "wa-login-user" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            לא נמצא משתמש פעיל עם מספר הטלפון הזה. עדכן את מספר המשתמש או אשר את החשבון לפני יצירת קוד.
          </div>
        ) : null}

        {params?.saved === "subadmin" ? (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-900">
            חשבון Sub-Admin נוצר בהצלחה.
          </div>
        ) : null}

        {params?.saved === "subadmin-removed" ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900">
            הרשאות ה-Sub-Admin בוטלו.
          </div>
        ) : null}

        {params?.error === "subadmin-invalid" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            נא למלא שם, מייל וסיסמה תקינה (אנגלית ומספרים בלבד, 8 תווים לפחות).
          </div>
        ) : null}

        {params?.error === "subadmin-protected" ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
            לא ניתן לשנות את חשבון המנהל הראשי.
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]" id="team">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-indigo-700">ניהול צוות</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">הוספת Sub-Admin</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sub-Admin יכול לנהל לקוחות VIP, לבנות פלואים ולראות אנליטיקות. אינו יכול למחוק מנהלים, לשנות חיוב, או לגשת לחשבון המנהל הראשי.
            </p>
            <form action={createSubAdminAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="שם מלא">
                <input className={inputClass()} name="fullName" required />
              </Field>
              <Field label="אימייל">
                <input className={inputClass()} dir="ltr" name="email" required type="email" />
              </Field>
              <Field label="סיסמה (אנגלית בלבד, 8+ תווים)">
                <input
                  className={inputClass()}
                  dir="ltr"
                  minLength={8}
                  name="password"
                  pattern="[A-Za-z0-9]+"
                  placeholder="Password123"
                  required
                  title="אנגלית ומספרים בלבד, 8+ תווים"
                  type="password"
                />
              </Field>
              <div className="flex items-end">
                <button className="h-11 w-full rounded-2xl bg-indigo-600 px-5 font-black text-white transition hover:-translate-y-0.5" type="submit">
                  צור Sub-Admin
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">חברי צוות פעילים</h2>
            <div className="mt-5 space-y-3">
              {subAdmins.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">אין עדיין חברי צוות.</p>
              ) : subAdmins.map((member: any) => {
                const isPrimary = member.email.toLowerCase() === PRIMARY_SUPER_ADMIN;

                return (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4" key={member.id}>
                    <div>
                      <p className="font-black text-slate-950">{member.fullName ?? member.name ?? member.email}</p>
                      <p className="text-sm text-slate-500" dir="ltr">{member.email}</p>
                      <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-black ${
                        member.globalRole === "SUPER_ADMIN"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {member.globalRole === "SUPER_ADMIN" ? "Super Admin ראשי" : "Sub Admin"}
                      </span>
                    </div>
                    {!isPrimary && member.globalRole !== "SUPER_ADMIN" ? (
                      <form action={deleteSubAdminAction}>
                        <input name="userId" type="hidden" value={member.id} />
                        <button className="h-10 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100" type="submit">
                          בטל הרשאות
                        </button>
                      </form>
                    ) : (
                      <span className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">מוגן</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">ממתינים לאישור</p>
            <p className="mt-3 text-4xl font-black">{pendingUsers.length}</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">לידים פתוחים</p>
            <p className="mt-3 text-4xl font-black">{leads.length}</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">לקוחות פעילים</p>
            <p className="mt-3 text-4xl font-black">{activeCount}</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">חיבורי WhatsApp</p>
            <p className="mt-3 text-4xl font-black">{connections.length}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3" id="auth-settings">
          <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">הגדרות כניסה</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              כאן מפעילים או מכבים כניסה עם Google ו-WhatsApp. Google יופיע ללקוחות רק אחרי שמוגדר Client Secret בשרת או בממשק.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${
                authSettings.googleLoginEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : authSettings.googleLoginAdminEnabled
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}>
                <p className="text-sm font-black">Google</p>
                <p className="mt-1 text-xs font-bold leading-5">
                  {authSettings.googleLoginEnabled
                    ? "פעיל ללקוחות"
                    : authSettings.googleLoginAdminEnabled
                      ? "נשמר בממשק, חסר GOOGLE_CLIENT_SECRET"
                      : "כבוי"}
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${
                authSettings.whatsappLoginEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}>
                <p className="text-sm font-black">WhatsApp OTP</p>
                <p className="mt-1 text-xs font-bold leading-5">
                  {authSettings.whatsappLoginEnabled
                    ? authSettings.whatsappSenderConfigured
                      ? "פעיל עם שולח אוטומטי"
                      : authSettings.whatsappManualCodeEnabled
                        ? "פעיל עם קוד ידני"
                        : "פעיל, אבל חסר שולח"
                    : "כבוי"}
                </p>
              </div>
            </div>
            <form action={saveAuthSettingsAction} className="mt-5 space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm font-bold text-slate-800">
                <input
                  className="mt-1"
                  defaultChecked={authSettings.googleLoginAdminEnabled}
                  name="googleLoginEnabled"
                  type="checkbox"
                />
                  <span>
                    הפעל כניסה והרשמה עם Google
                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                    סטטוס Google OAuth: {authSettings.googleConfigured ? "מוגדר" : "חסר Client Secret"}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 text-sm font-bold text-slate-800">
                <input
                  className="mt-1"
                  defaultChecked={authSettings.whatsappLoginEnabled}
                  name="whatsappLoginEnabled"
                  type="checkbox"
                />
                <span>
                  הפעל כניסה עם קוד WhatsApp
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    שולח קודים: {authSettings.whatsappSenderConfigured ? "מוגדר" : "לא מוגדר"}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm font-bold text-slate-800">
                <input
                  className="mt-1"
                  defaultChecked={authSettings.whatsappManualCodeEnabled}
                  name="whatsappManualCodeEnabled"
                  type="checkbox"
                />
                <span>
                  אפשר קוד WhatsApp ידני מהממשק
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    שימושי לפני שמחברים שולח WhatsApp Official.
                  </span>
                </span>
              </label>
              <SuccessSubmitButton>שמור הגדרות כניסה</SuccessSubmitButton>
            </form>
          </div>

          <div className="rounded-[32px] border border-violet-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Google OAuth</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              מלא כאן את פרטי Google כדי להפעיל Login והרשמה עם Google וגם חיבור Google Contacts.
            </p>
            <div className={`mt-4 rounded-2xl border p-4 text-sm font-bold leading-6 ${
              googleOAuthSettings.configured
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}>
              {googleOAuthSettings.configured ? "Google OAuth מוגדר." : `חסר: ${googleOAuthSettings.missing.join(", ")}`}
              <span className="mt-1 block text-xs">מקור Client ID: {googleOAuthSettings.source.clientId} · מקור Secret: {googleOAuthSettings.source.clientSecret}</span>
            </div>
            <form action={saveGoogleOAuthSettingsAction} className="mt-5 space-y-3">
              <Field label="Google Client ID">
                <input className={inputClass()} defaultValue={googleOAuthSettings.clientId} dir="ltr" name="googleClientId" required />
              </Field>
              <Field label="Google Client Secret">
                <input
                  className={inputClass()}
                  dir="ltr"
                  name="googleClientSecret"
                  placeholder={googleOAuthSettings.secretConfigured ? "השאר ריק כדי לא לשנות" : "חובה להפעלת Google"}
                  type="password"
                />
              </Field>
              <Field label="Redirect URI">
                <input className={inputClass()} defaultValue={googleOAuthSettings.redirectUri} dir="ltr" name="googleRedirectUri" />
              </Field>
              <button className="h-11 w-full rounded-2xl bg-violet-600 px-5 font-black text-white transition hover:-translate-y-0.5" type="submit">
                שמור Google OAuth
              </button>
            </form>
          </div>

          <div className="rounded-[32px] border border-cyan-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">קוד WhatsApp ידני</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              אם אין עדיין שליחת WhatsApp פעילה, אפשר להגדיר קוד זמני למשתמש פעיל לפי מספר הטלפון שלו.
            </p>
            <form action={setManualWhatsAppLoginCodeAction} className="mt-5 grid gap-3 md:grid-cols-3">
              <Field label="מספר טלפון">
                <input className={inputClass()} defaultValue="+972542466340" dir="ltr" name="phone" required />
              </Field>
              <Field label="קוד">
                <input className={inputClass()} dir="ltr" inputMode="numeric" maxLength={8} minLength={4} name="code" placeholder="123456" required />
              </Field>
              <Field label="תוקף בדקות">
                <input className={inputClass()} defaultValue="30" max="120" min="5" name="expiresMinutes" type="number" />
              </Field>
              <button className="h-11 rounded-2xl bg-emerald-600 px-5 font-black text-white md:col-span-3" type="submit">
                שמור קוד למשתמש
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-[32px] border border-cyan-100 bg-white p-6 shadow-sm" id="smtp-settings">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-cyan-700">מערכת מיילים</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">SMTP לפניות, אישורים ואיפוסי סיסמה</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                אם פנייה נשמרה אבל לא קיבלת מייל, כמעט תמיד חסר SMTP_PASS. אפשר להשלים כאן את פרטי Gmail App Password ולשלוח מייל בדיקה.
              </p>
            </div>
            <span className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-black ${
              smtpSettings.configured
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900"
            }`}>
              {smtpSettings.configured ? "מוגדר ופעיל" : `חסר: ${smtpSettings.missing.join(", ")}`}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["Host", smtpSettings.host, smtpSettings.source.host],
              ["User", smtpSettings.user, smtpSettings.source.user],
              ["From", smtpSettings.from, smtpSettings.source.from],
              ["Port", String(smtpSettings.port), smtpSettings.source.port],
              ["Password", smtpSettings.passConfigured ? "מוגדר" : "חסר", smtpSettings.source.pass]
            ].map(([label, value, source]) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={label}>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-2 truncate text-sm font-black text-slate-950" dir={label === "Password" ? "rtl" : "ltr"}>{value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">מקור: {source}</p>
              </div>
            ))}
          </div>

          <form action={saveSmtpSettingsAction} className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field label="SMTP Host">
              <input className={inputClass()} defaultValue={smtpSettings.host} dir="ltr" name="smtpHost" required />
            </Field>
            <Field label="SMTP Port">
              <input className={inputClass()} defaultValue={smtpSettings.port} dir="ltr" min="1" name="smtpPort" required type="number" />
            </Field>
            <Field label="SMTP User">
              <input className={inputClass()} defaultValue={smtpSettings.user} dir="ltr" name="smtpUser" required type="email" />
            </Field>
            <Field label="SMTP From">
              <input className={inputClass()} defaultValue={smtpSettings.from} dir="ltr" name="smtpFrom" required type="email" />
            </Field>
            <Field label="SMTP Password / App Password">
              <input className={inputClass()} dir="ltr" name="smtpPass" placeholder={smtpSettings.passConfigured ? "השאר ריק כדי לא לשנות" : "חובה למיילים"} type="password" />
            </Field>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 xl:col-span-2">
              <input defaultChecked={smtpSettings.secure} name="smtpSecure" type="checkbox" />
              חיבור מאובטח SSL/TLS
            </label>
            <button className="h-11 rounded-2xl bg-gradient-to-l from-cyan-400 to-emerald-400 px-5 font-black text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,0.18)] transition hover:-translate-y-0.5 xl:col-span-2" type="submit">
              שמור הגדרות מייל
            </button>
          </form>

          <form action={sendTestEmailAction} className="mt-3">
            <button className="h-11 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 text-sm font-black text-cyan-900 transition hover:bg-cyan-100" type="submit">
              שלח מייל בדיקה למנהל
            </button>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" id="customers">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">יצירת לקוח מהירה</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">פותח משתמש, שולח מייל בחירת סיסמה, ובבחירה שלך גם מפעיל סביבת עבודה מיד.</p>
            <form action={createCustomerAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="שם מלא">
                <input className={inputClass()} name="fullName" required />
              </Field>
              <Field label="אימייל">
                <input className={inputClass()} dir="ltr" name="email" required type="email" />
              </Field>
              <Field label="טלפון">
                <input className={inputClass()} dir="ltr" name="phone" />
              </Field>
              <label className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
                <input name="activateNow" type="checkbox" value="1" />
                להפעיל מיד בלי המתנה לאישור
              </label>
              <button className="h-12 rounded-2xl bg-slate-950 px-5 font-black text-white md:col-span-2" type="submit">
                צור לקוח ושלח מייל
              </button>
            </form>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">לקוחות</h2>
            <div className="mt-5 max-h-[430px] space-y-3 overflow-auto pr-1">
              {customers.map((user: any) => {
                const workspace = workspaceByEmail.get(user.email);

                return (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={user.id}>
                    <div>
                      <p className="font-black text-slate-950">{user.fullName ?? user.name ?? user.email}</p>
                      <p className="text-sm text-slate-500" dir="ltr">{user.email}</p>
                      <p className="text-sm text-slate-500">סטטוס: {statusLabels[user.accountStatus] ?? user.accountStatus}</p>
                      {workspace ? <p className="text-sm text-slate-500">סביבה: {workspace.name}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workspace ? (
                        <form action={viewWorkspaceAction}>
                          <input name="workspaceId" type="hidden" value={workspace.id} />
                          <button className="h-10 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white" type="submit">כניסה לממשק</button>
                        </form>
                      ) : null}
                      {user.accountStatus === "active" ? (
                        <form action={suspendUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="h-10 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800" type="submit">נעל משתמש</button>
                        </form>
                      ) : user.accountStatus === "suspended" ? (
                        <form action={activateUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="h-10 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white" type="submit">שחרר נעילה</button>
                        </form>
                      ) : (
                        <form action={activateUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="h-10 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white" type="submit">הפעל</button>
                        </form>
                      )}
                      <form action={changeUserPasswordAction} className="flex flex-wrap items-center gap-2">
                        <input name="userId" type="hidden" value={user.id} />
                        <input
                          className="h-10 w-36 rounded-2xl border border-slate-200 px-3 text-left text-sm outline-none focus:border-blue-400"
                          dir="ltr"
                          minLength={8}
                          name="password"
                          pattern="[A-Za-z0-9]+"
                          placeholder="NewPass123"
                          required
                          title="סיסמה באנגלית ומספרים בלבד"
                          type="password"
                        />
                        <button className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700" type="submit">עדכן סיסמה</button>
                      </form>
                      {workspace ? (
                        <form action={adjustContactQuotaAction} className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 p-2">
                          <input name="workspaceId" type="hidden" value={workspace.id} />
                          <select className="h-10 rounded-2xl border border-violet-200 bg-white px-3 text-sm" name="mode">
                            <option value="packs">חבילות של 100</option>
                            <option value="contacts">מספר אנשי קשר</option>
                          </select>
                          <input className="h-10 w-24 rounded-2xl border border-violet-200 px-3 text-center text-sm outline-none focus:border-violet-400" defaultValue="1" min="1" name="amount" type="number" />
                          <button className="h-10 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white" type="submit">הגדל מכסה</button>
                          <span className="text-xs font-bold text-violet-900">
                            {workspace.contactBotUsedQuota ?? 0}/{(workspace.contactBotBaseQuota ?? 600) + (workspace.contactBotExtraQuota ?? 0)}
                          </span>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {upgradeRequests.length > 0 ? (
          <section className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">בקשות שדרוג מכסת אנשי קשר</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {upgradeRequests.map((request: any) => (
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4" key={request.id}>
                  <p className="font-black text-violet-950">{request.workspace?.name ?? "לקוח"}</p>
                  <p className="mt-1 text-sm text-violet-900">
                    {request.requestedContacts} אנשי קשר נוספים · {(request.estimatedPriceCents / 100).toLocaleString("he-IL")} ₪
                  </p>
                  <form action={adjustContactQuotaAction} className="mt-3 flex flex-wrap items-center gap-2">
                    <input name="workspaceId" type="hidden" value={request.workspaceId} />
                    <input name="mode" type="hidden" value="contacts" />
                    <input name="amount" type="hidden" value={request.requestedContacts} />
                    <button className="h-10 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white" type="submit">
                      אשר והגדל
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[32px] bg-white p-6 shadow-sm" id="automations">
            <h2 className="text-xl font-black text-slate-950">אוטומציות</h2>
            <form action={createAutomationAction} className="mt-4 space-y-3">
              <Field label="לקוח">
                <select className={selectClass()} name="workspaceId">
                  <option value="">כללי</option>
                  {workspaces.map((workspace: any) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
              </Field>
              <Field label="שם אוטומציה">
                <input className={inputClass()} name="name" placeholder="עדכון ערב לפני ההגרלה" />
              </Field>
              <Field label="סוג">
                <select className={selectClass()} name="triggerKind">
                  <option value="fixed_time">שליחה בשעה מסוימת</option>
                  <option value="delay_after_join">שליחה X דקות אחרי הצטרפות</option>
                </select>
              </Field>
              <Field label="תאריך ושעה">
                <input className={inputClass()} name="scheduledAt" type="datetime-local" />
              </Field>
              <Field label="דקות אחרי הצטרפות">
                <input className={inputClass()} min="1" name="delayMinutes" type="number" />
              </Field>
              <Field label="הודעה">
                <textarea className={textAreaClass()} name="message" required />
              </Field>
              <button className="h-11 w-full rounded-2xl bg-slate-950 font-black text-white" type="submit">שמור אוטומציה</button>
            </form>
            <div className="mt-4 space-y-2">
              {automationRules.map((rule: any) => (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600" key={rule.id}>{rule.name} · {rule.workspace?.name ?? "כללי"}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm" id="newsletters">
            <h2 className="text-xl font-black text-slate-950">ניוזלטר</h2>
            <form action={createNewsletterDraftAction} className="mt-4 space-y-3">
              <Field label="קהל יעד">
                <select className={selectClass()} name="audience">
                  <option value="active_users">לקוחות פעילים</option>
                  <option value="all_users">כל המשתמשים</option>
                  <option value="leads">לידים</option>
                </select>
              </Field>
              <Field label="נושא">
                <input className={inputClass()} name="subject" required />
              </Field>
              <Field label="תוכן">
                <textarea className={textAreaClass()} name="body" required />
              </Field>
              <button className="h-11 w-full rounded-2xl bg-blue-600 font-black text-white" type="submit">שמור טיוטת ניוזלטר</button>
            </form>
            <div className="mt-4 space-y-2">
              {broadcasts.map((broadcast: any) => (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600" key={broadcast.id}>{broadcast.subject} · {broadcast.status}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">עריכת אתר</h2>
            <form action={saveSiteContentAction} className="mt-4 space-y-3">
              <Field label="כותרת ראשית">
                <input className={inputClass()} defaultValue={siteContent.get("landing_title") ?? ""} name="landing_title" />
              </Field>
              <Field label="טקסט משנה">
                <textarea className={textAreaClass()} defaultValue={siteContent.get("landing_subtitle") ?? ""} name="landing_subtitle" />
              </Field>
              <Field label="מחיר">
                <input className={inputClass()} defaultValue={siteContent.get("landing_price") ?? ""} name="landing_price" />
              </Field>
              <button className="h-11 w-full rounded-2xl bg-violet-600 font-black text-white" type="submit">שמור תוכן אתר</button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] bg-white p-6 shadow-sm" id="connections">
            <h2 className="text-2xl font-black text-slate-950">חיבורי WhatsApp</h2>
            <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              <p className="font-black">איך מחברים נכון?</p>
              <p className="mt-1">
                חיבור רשמי: מזינים מספר בפורמט <span dir="ltr">+972...</span>, Phone Number ID, WABA ID ו-Access Token ממטא. הטוקן נשמר מוצפן במסד הנתונים.
              </p>
              <p className="mt-1">
                חיבור ברקוד: מיועד לצוות בלבד. הלקוח לא רואה QR או Pairing Code; הוא מקבל חוויית Zero-Touch. אם בוחרים חיבור ברקוד, מוסיפים מספר ושם חיבור, ואת פעולת הסריקה עושים מכלי הצוות.
              </p>
            </div>
            <form action={createConnectionAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Workspace בעל החיבור">
                <select className={selectClass()} name="workspaceId" required>
                  {workspaces.map((workspace: any) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
              </Field>
              <Field label="שם החיבור">
                <input className={inputClass()} name="label" placeholder="מספר ראשי" />
              </Field>
              <Field label="מספר">
                <input className={inputClass()} dir="ltr" name="phoneNumber" placeholder="+972..." />
              </Field>
              <Field label="סוג">
                <select className={selectClass()} name="provider">
                  <option value="official_business">WhatsApp Business Cloud · רשמי</option>
                  <option value="unofficial_qr">WhatsApp Web · כלי צוות בלבד</option>
                </select>
              </Field>
              <Field label="מקסימום לקוחות">
                <input className={inputClass()} defaultValue="3" min="1" name="maxTenants" type="number" />
              </Field>
              <Field label="Meta Phone Number ID">
                <input className={inputClass()} dir="ltr" name="officialPhoneNumberId" placeholder="1234567890" />
              </Field>
              <Field label="Meta WABA ID">
                <input className={inputClass()} dir="ltr" name="officialWabaId" placeholder="1234567890" />
              </Field>
              <Field label="Meta Access Token">
                <input className={inputClass()} dir="ltr" name="officialAccessToken" placeholder="נשמר מוצפן" type="password" />
              </Field>
              <Field label="Webhook Verify Token">
                <input className={inputClass()} dir="ltr" name="officialWebhookVerifyToken" placeholder="verify-token" type="password" />
              </Field>
              <button className="h-11 self-end rounded-2xl bg-emerald-600 px-5 font-black text-white" type="submit">הוסף חיבור</button>
            </form>
            <div className="mt-5 space-y-2">
              {connections.map((connection: any) => (
                <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 md:grid-cols-[1fr_auto]" key={connection.id}>
                  <p>
                    {connection.label} · {connection.workspace?.name ?? "Workspace"} · {connection.status} · <span dir="ltr">{connection.phoneNumber ?? "אין מספר"}</span> · {connection.currentTenants}/{connection.maxTenants}
                  </p>
                  <form action={viewWorkspaceConnectionsAction}>
                    <input name="workspaceId" type="hidden" value={connection.workspaceId} />
                    <button className="h-10 rounded-2xl bg-cyan-600 px-4 text-sm font-black text-white" type="submit">
                      סריקת QR / חיבור
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm" id="billing">
            <h2 className="text-2xl font-black text-slate-950">קבלות ותשלומים</h2>
            <form action={createBillingAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="לקוח">
                <select className={selectClass()} name="workspaceId" required>
                  {workspaces.map((workspace: any) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
              </Field>
              <Field label="תיאור">
                <input className={inputClass()} name="label" placeholder="מבצע בזק / מסלול חודשי" required />
              </Field>
              <Field label="סכום בש״ח">
                <input className={inputClass()} min="1" name="amount" required type="number" />
              </Field>
              <Field label="סטטוס">
                <select className={selectClass()} name="status">
                  <option value="draft">טיוטה</option>
                  <option value="paid">שולם</option>
                  <option value="open">פתוח</option>
                </select>
              </Field>
              <button className="h-11 rounded-2xl bg-slate-950 px-5 font-black text-white md:col-span-2" type="submit">צור רשומת תשלום</button>
            </form>
            <div className="mt-5 space-y-2">
              {billingRecords.map((record: any) => (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600" key={record.id}>
                  {record.workspace?.name} · {record.label} · ₪{(record.amountCents / 100).toLocaleString("he-IL")} · {record.status}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">משתמשים ממתינים</h2>
            <div className="mt-5 space-y-3">
              {pendingUsers.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">אין משתמשים שממתינים כרגע.</p>
              ) : pendingUsers.map((user: any) => (
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={user.id}>
                  <div>
                    <p className="font-black text-slate-950">{user.fullName ?? user.name ?? user.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{user.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{user.phone ?? ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={approveUserAction}><input name="userId" type="hidden" value={user.id} /><button className="h-11 rounded-2xl bg-emerald-600 px-5 font-black text-white" type="submit">אשר</button></form>
                    <form action={rejectUserAction}><input name="userId" type="hidden" value={user.id} /><button className="h-11 rounded-2xl border border-red-200 px-5 font-black text-red-700" type="submit">דחה</button></form>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">לידים מצור קשר</h2>
            <div className="mt-5 space-y-3">
              {leads.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">אין לידים פתוחים כרגע.</p>
              ) : leads.map((lead: any) => (
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={lead.id}>
                  <div>
                    <p className="font-black text-slate-950">{lead.fullName}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{lead.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{lead.phone ?? ""}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{lead.message ?? ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={convertLeadAction}><input name="leadId" type="hidden" value={lead.id} /><button className="h-11 rounded-2xl bg-blue-600 px-4 font-black text-white" type="submit">המר לממתין</button></form>
                    <form action={convertLeadAction}><input name="leadId" type="hidden" value={lead.id} /><input name="approve" type="hidden" value="1" /><button className="h-11 rounded-2xl bg-emerald-600 px-4 font-black text-white" type="submit">המר ואשר</button></form>
                    <form action={closeLeadAction}><input name="leadId" type="hidden" value={lead.id} /><button className="h-11 rounded-2xl border border-slate-200 px-4 font-black text-slate-600" type="submit">סגור</button></form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
