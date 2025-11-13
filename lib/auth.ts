import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { Adapter } from "next-auth/adapters";
import { logError, logAuth } from "@/lib/logger";

interface OAuthProfile {
  sub?: string;
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
  avatar_url?: string;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    // OAuth SSO provider (required for authentication)
    ...(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET
      ? [
          {
            id: "custom-sso",
            name: "SSO",
            type: "oauth" as const,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            authorization: {
              url: process.env.OAUTH_AUTHORIZATION_URL!,
              params: {
                // Use OAUTH_SCOPE env var, fallback to GitHub scopes for production
                scope: process.env.OAUTH_SCOPE || "read:user user:email"
              },
            },
            token: process.env.OAUTH_TOKEN_URL!,
            userinfo: process.env.OAUTH_USERINFO_URL!,
            checks: ["state" as const], // Disable PKCE and id_token validation (OAuth 2.0, not OIDC)
            idToken: false, // GitHub OAuth doesn't provide id_token
            profile(profile: OAuthProfile) {
              // Check if this email should be admin
              const adminEmails = process.env.ADMIN_EMAILS?.split(",")
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean) || [];
              const userEmail = profile.email?.toLowerCase() || "";
              const isAdminEmail = adminEmails.includes(userEmail);

              return {
                id: String(profile.sub || profile.id || ""),
                name: profile.name,
                email: profile.email,
                image: profile.picture || profile.avatar_url,
                role: isAdminEmail ? "admin" : "user",
              };
            },
          },
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add user id and role to session (user comes from database)
      if (user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: string }).role || "user";
      }
      return session;
    },
    async signIn({ user }) {
      // Check if user is banned
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });

      if (dbUser?.status === "banned" || dbUser?.status === "suspended") {
        return false; // Prevent login
      }

      // First user becomes admin (fallback if ADMIN_EMAILS not set)
      const userCount = await prisma.user.count();
      if (userCount === 1 && user.email) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
      }

      // Update last login time
      prisma.user
        .update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
        .then(() => logAuth('login', user.id))
        .catch((err) => logError(err, { auth: { event: 'update_lastLoginAt', userId: user.id } }));

      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database", // OAuth supports database sessions for better security
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
