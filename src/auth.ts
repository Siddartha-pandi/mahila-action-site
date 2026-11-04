import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { queryDb } from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // Check environment superadmin
        const envSuperEmail = (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
        const envSuperPass = process.env.SUPERADMIN_PASSWORD;

        if (envSuperEmail && email === envSuperEmail && envSuperPass && password === envSuperPass) {
          return {
            id: "superadmin_env",
            email: envSuperEmail,
            name: "Super Admin",
            role: "superadmin",
          };
        }

        // Check database users
        try {
          const res = await queryDb(
            "SELECT id, name, email, role, password_hash, permissions, status FROM users WHERE LOWER(email) = $1",
            [email]
          );

          if (res.rows.length === 0) {
            return null;
          }

          const user = res.rows[0];
          if (user.status && user.status !== "Active") {
            return null;
          }

          const match = await bcrypt.compare(password, user.password_hash);
          if (!match) {
            return null;
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role || "user",
          };
        } catch (err) {
          console.error("Auth.js authorize error:", err);
          return null;
        }
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "admin";
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.JWT_SECRET || "default_authjs_secret_key_dev",
  trustHost: true,
});

