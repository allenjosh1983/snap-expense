import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { ensureUser, updateUserGoogleTokens } from "@/lib/db";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || !account) return false;

      ensureUser(email);

      if (account.access_token || account.refresh_token) {
        updateUserGoogleTokens(email, {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ?? null,
        });
      }

      return true;
    },
  },
});
