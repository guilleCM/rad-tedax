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

          const valid = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash,
          );
          if (!valid) {
            console.warn("[auth] invalid password for:", parsed.data.email);
            return null;
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("[auth] DB error during login:", error);
          return null;
        }
      },
    }),
  ],
});
