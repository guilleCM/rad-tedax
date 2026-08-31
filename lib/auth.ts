import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { getCollection } from "@/lib/db";
import type { UserDoc } from "@/lib/types";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email =
          typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        const password =
          typeof raw?.password === "string" ? raw.password.trim() : "";
        const parsed = credentialsSchema.safeParse({ email, password });
        if (!parsed.success) return null;

        try {
          const users = await getCollection<UserDoc>("users");
          const user = await users.findOne({ email: parsed.data.email });
          if (!user) {
            console.warn("[auth] user not found:", parsed.data.email);
            return null;
          }

          if (!user.passwordHash) {
            console.warn("[auth] account has no password:", parsed.data.email);
            return null;
          }

          const valid = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash,
          );
          if (!valid) {
            console.warn("[auth] invalid password for:", parsed.data.email);
            return null;
          }

          if (user.role === "participant") {
            throw new Error("NO_APP_ACCESS");
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email ?? parsed.data.email,
            role: user.role,
          };
        } catch (error) {
          if (error instanceof Error && error.message === "NO_APP_ACCESS") {
            throw error;
          }
          console.error("[auth] DB error during login:", error);
          return null;
        }
      },
    }),
  ],
});
