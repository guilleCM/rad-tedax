import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/types";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole) ?? "participant";
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
