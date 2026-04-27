import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { WorkspaceRepository } from "@lottery/core";

const DEFAULT_GOOGLE_CLIENT_ID =
  "455116448878-mlsaq4mflpdm8fpkisnak26tjhmtduf3.apps.googleusercontent.com";

const workspaceRepository = new WorkspaceRepository();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  providers: [
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
        account.providerAccountId &&
        account.access_token
      ) {
        const primaryWorkspace = await workspaceRepository.getPrimaryWorkspace();

        await workspaceRepository.upsertGoogleOAuthTokens({
          workspaceId: primaryWorkspace?.id,
          ownerEmail: user.email,
          ownerName: user.name ?? user.email,
          googleSubject: account.providerAccountId,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at
        });
      }

      return true;
    }
  }
});
