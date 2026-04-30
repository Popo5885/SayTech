import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createHash } from "node:crypto";
import { WorkspaceRepository } from "@lottery/core";
import { prisma } from "@lottery/db";
import type { NextAuthConfig } from "next-auth";
import { isWhatsAppLoginEnabled } from "./lib/auth-settings";
import { getGoogleOAuthSettings } from "./lib/google-settings";
import { normalizeIsraeliPhone } from "./lib/phone";
import { hashPassword, hashVerificationCode, verifyPassword } from "./lib/password";

const SYSTEM_ADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();

const db = prisma as any;
const workspaceRepository = new WorkspaceRepository();

export async function isGoogleAuthConfigured() {
  return (await getGoogleOAuthSettings()).configured;
}

function resolveAuthSecret() {
  const explicitSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (explicitSecret) {
    return explicitSecret;
  }

  const stableServerSeed = [
    process.env.DATABASE_URL,
    process.env.RAILWAY_SERVICE_ID,
    process.env.RAILWAY_ENVIRONMENT_ID,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL
  ]
    .filter(Boolean)
    .join("|");

  if (stableServerSeed) {
    return createHash("sha256").update(`magic-flow-auth:${stableServerSeed}`).digest("hex");
  }

  return "magic-flow-local-development-secret";
}

function initialAdminPasswordMatches(password: string) {
  const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;

  return Boolean(initialPassword && password === initialPassword);
}

async function createInitialAdminUser(email: string, password: string) {
  const now = new Date();
  const displayName = process.env.SUPERADMIN_NAME ?? "צוות Magic Flow";

  return db.user.create({
    data: {
      email,
      fullName: displayName,
      name: displayName,
      passwordHash: hashPassword(password),
      accountStatus: "active",
      globalRole: "SUPER_ADMIN",
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
      approvedAt: now,
      lastLoginAt: now
    }
  });
}

async function buildAuthConfig(): Promise<NextAuthConfig> {
  const googleSettings = await getGoogleOAuthSettings();

  return {
    trustHost: true,
    secret: resolveAuthSecret(),
    pages: {
      signIn: "/login",
      error: "/login"
    },
    session: {
      strategy: "jwt"
    },
    providers: [
    Credentials({
      name: "כניסה עם מייל וסיסמה",
      credentials: {
        email: { label: "אימייל", type: "email" },
        password: { label: "סיסמה", type: "password" },
        phone: { label: "טלפון", type: "text" },
        otpCode: { label: "קוד WhatsApp", type: "text" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const phone = normalizeIsraeliPhone(String(credentials?.phone ?? ""));
        const otpCode = String(credentials?.otpCode ?? "").trim();

        if (phone && otpCode) {
          if (!(await isWhatsAppLoginEnabled())) {
            return null;
          }

          const token = await db.whatsAppLoginCode.findFirst({
            where: {
              phone,
              codeHash: hashVerificationCode(otpCode),
              usedAt: null,
              expiresAt: {
                gt: new Date()
              }
            },
            orderBy: {
              createdAt: "desc"
            }
          });
          const user = token
            ? await db.user.findFirst({
                where: {
                  phone,
                  accountStatus: "active"
                }
              })
            : null;

          if (!token || !user) {
            return null;
          }

          await Promise.all([
            db.whatsAppLoginCode.update({
              where: { id: token.id },
              data: { usedAt: new Date() }
            }),
            db.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() }
            })
          ]);

          return {
            id: user.id,
            email: user.email,
            name: user.fullName ?? user.name ?? user.email,
            accountStatus: user.accountStatus,
            globalRole: user.globalRole
          } as any;
        }

        if (!email || !password) {
          return null;
        }

        const isSystemAdmin = email === SYSTEM_ADMIN_EMAIL;
        let user = await db.user.findUnique({ where: { email } });

        if (!user && isSystemAdmin && initialAdminPasswordMatches(password)) {
          user = await createInitialAdminUser(email, password);
        }

        const passwordIsValid = user ? verifyPassword(password, user.passwordHash) : false;
        const shouldRepairSystemAdmin =
          Boolean(user) &&
          isSystemAdmin &&
          !passwordIsValid &&
          initialAdminPasswordMatches(password);

        if (!user || (!passwordIsValid && !shouldRepairSystemAdmin)) {
          return null;
        }

        const updatedUser = await db.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            ...(isSystemAdmin
              ? {
                  ...(shouldRepairSystemAdmin ? { passwordHash: hashPassword(password) } : {}),
                  accountStatus: "active",
                  globalRole: "SUPER_ADMIN",
                  approvedAt: user.approvedAt ?? new Date()
                }
              : {})
          }
        });

        return {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.fullName ?? updatedUser.name ?? updatedUser.email,
          accountStatus: updatedUser.accountStatus,
          globalRole: isSystemAdmin ? "SUPER_ADMIN" : updatedUser.globalRole
        } as any;
      }
    }),
    ...(googleSettings.configured
      ? [
          Google({
            clientId: googleSettings.clientId,
            clientSecret: googleSettings.clientSecret,
            authorization: {
              params: {
                access_type: "offline",
                prompt: "consent",
                response_type: "code",
                scope:
                  "openid email profile https://www.googleapis.com/auth/contacts"
              }
            }
          })
        ]
      : [])
    ],
    callbacks: {
    async signIn({ user, account }) {
      if (
        account?.provider === "google" &&
        user.email &&
        account.providerAccountId
      ) {
        const email = user.email.toLowerCase();
        const isSystemAdmin = email === SYSTEM_ADMIN_EMAIL;
        const existingUser = await db.user.findUnique({ where: { email } });
        const linkedUser = await db.user.upsert({
          where: { email },
          update: {
            googleSubject: account.providerAccountId,
            fullName: existingUser?.fullName ?? user.name ?? user.email,
            name: existingUser?.name ?? user.name ?? user.email,
            globalRole: isSystemAdmin ? "SUPER_ADMIN" : existingUser?.globalRole,
            accountStatus: isSystemAdmin ? "active" : existingUser?.accountStatus,
            approvedAt: isSystemAdmin && !existingUser?.approvedAt ? new Date() : existingUser?.approvedAt,
            lastLoginAt: new Date()
          },
          create: {
            email,
            googleSubject: account.providerAccountId,
            fullName: user.name ?? user.email,
            name: user.name ?? user.email,
            accountStatus: isSystemAdmin ? "active" : "pending",
            globalRole: isSystemAdmin ? "SUPER_ADMIN" : "USER",
            approvedAt: isSystemAdmin ? new Date() : null,
            phone: null
          }
        });

        if (account.access_token) {
          const membership = await db.workspaceMember.findFirst({
            where: {
              userId: linkedUser.id,
              workspace: {
                accountStatus: "active"
              }
            },
            orderBy: {
              createdAt: "asc"
            }
          });

          if (membership?.workspaceId) {
            await workspaceRepository.upsertGoogleOAuthTokens({
              workspaceId: membership.workspaceId,
              ownerEmail: user.email,
              ownerName: user.name ?? user.email,
              googleSubject: account.providerAccountId,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: account.expires_at
            });
          }
        }

        (user as any).id = linkedUser.id;
        (user as any).accountStatus = linkedUser.accountStatus;
        (user as any).globalRole = isSystemAdmin ? "SUPER_ADMIN" : linkedUser.globalRole;
      }

      if ((user as any).accountStatus && (user as any).accountStatus !== "active") {
        return "/waiting-room";
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.accountStatus = (user as any).accountStatus;
        token.globalRole = (user as any).globalRole;
        token.userId = (user as any).id;
      }

      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.userId;
      (session.user as any).accountStatus = token.accountStatus;
      (session.user as any).globalRole = token.globalRole;

      return session;
    }
    }
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(async () => buildAuthConfig());
