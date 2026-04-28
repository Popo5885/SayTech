import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { WorkspaceRepository } from "@lottery/core";
import { prisma } from "@lottery/db";
import { verifyPassword } from "./lib/password";
import { normalizeIsraeliPhone } from "./lib/phone";

const DEFAULT_GOOGLE_CLIENT_ID =
  "455116448878-mlsaq4mflpdm8fpkisnak26tjhmtduf3.apps.googleusercontent.com";
const SYSTEM_ADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();

const db = prisma as any;
const workspaceRepository = new WorkspaceRepository();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "magic-flow-local-development-secret"),
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "כניסה עם מייל וסיסמה",
      credentials: {
        email: { label: "אימייל", type: "email" },
        password: { label: "סיסמה", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user || !verifyPassword(password, user.passwordHash)) {
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName ?? user.name ?? user.email,
          accountStatus: user.accountStatus,
          globalRole: email === SYSTEM_ADMIN_EMAIL ? "SUPER_ADMIN" : user.globalRole
        } as any;
      }
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (
        account?.provider === "google" &&
        user.email &&
        account.providerAccountId
      ) {
        const email = user.email.toLowerCase();
        const existingUser = await db.user.findUnique({ where: { email } });
        const linkedUser = await db.user.upsert({
          where: { email },
          update: {
            googleSubject: account.providerAccountId,
            fullName: existingUser?.fullName ?? user.name ?? user.email,
            name: existingUser?.name ?? user.name ?? user.email,
            lastLoginAt: new Date()
          },
          create: {
            email,
            googleSubject: account.providerAccountId,
            fullName: user.name ?? user.email,
            name: user.name ?? user.email,
            accountStatus: "pending",
            phone: normalizeIsraeliPhone(null)
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
        (user as any).globalRole =
          email === SYSTEM_ADMIN_EMAIL ? "SUPER_ADMIN" : linkedUser.globalRole;

        if (linkedUser.accountStatus !== "active") {
          return "/pending";
        }
      }

      if ((user as any).accountStatus && (user as any).accountStatus !== "active") {
        return "/pending";
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
});
