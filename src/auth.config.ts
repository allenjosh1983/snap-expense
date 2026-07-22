import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session }) {
      if (session.user?.email) {
        session.user.email = session.user.email.toLowerCase();
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
