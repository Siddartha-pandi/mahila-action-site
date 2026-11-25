import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { queryDb } from "./lib/db";
import { getJwtSecret } from "./lib/auth";

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
        const envSuperPass = (process.env.SUPERADMIN_PASSWORD || "").trim();

        if (envSuperEmail && email === envSuperEmail && envSuperPass) {
          const inputPass = password.trim();
          let isSuperMatch = inputPass === envSuperPass;
          if (!isSuperMatch && envSuperPass.startsWith("$2")) {
            try {
              isSuperMatch = bcrypt.compareSync(inputPass, envSuperPass);
            } catch {}
          }
          if (isSuperMatch) {
            return {
              id: "superadmin_env",
              email: envSuperEmail,
              name: "Super Admin",
              role: "superadmin",
            };
          }
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
        let resolvedRole = (user as any).role as string | undefined;
        let resolvedId = user.id;

        if (!resolvedRole && user.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          const envSuperEmail = (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
          if (envSuperEmail && cleanEmail === envSuperEmail) {
            resolvedRole = "superadmin";
            resolvedId = "superadmin_env";
          } else {
            try {
              const dbRes = await queryDb(
                "SELECT id, role, status FROM users WHERE LOWER(email) = $1 LIMIT 1",
                [cleanEmail]
              );
              const dbUser = dbRes.rows[0];
              if (dbUser && (!dbUser.status || dbUser.status === "Active")) {
                resolvedId = String(dbUser.id);
                resolvedRole = dbUser.role || "user";
              } else {
                resolvedRole = "user";
              }
            } catch {
              resolvedRole = "user";
            }
          }
        }

        token.id = resolvedId;
        token.role = resolvedRole || "user";
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = (token.role as string) || "user";
      }
      return session;
    },
  },
  secret: getJwtSecret(),
  trustHost: true,
});

