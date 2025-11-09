import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    {
      id: "custom-sso",
      name: "SSO",
      type: "oauth",
      clientId: process.env.OAUTH_CLIENT_ID!,
      clientSecret: process.env.OAUTH_CLIENT_SECRET!,
      wellKnown: process.env.OAUTH_ISSUER
        ? `${process.env.OAUTH_ISSUER}/.well-known/openid-configuration`
        : undefined,
      authorization: {
        url: process.env.OAUTH_AUTHORIZATION_URL!,
        params: { scope: "openid email profile" },
      },
      token: process.env.OAUTH_TOKEN_URL!,
      userinfo: process.env.OAUTH_USERINFO_URL!,
      profile(profile) {
        // Check if this email should be admin
        const adminEmails = process.env.ADMIN_EMAILS?.split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean) || [];
        const userEmail = profile.email?.toLowerCase() || "";
        const isAdminEmail = adminEmails.includes(userEmail);

        return {
          id: profile.sub || profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture || profile.avatar_url,
          role: isAdminEmail ? "admin" : "user",
        };
      },
    },
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: string }).role || "user";

        // Update last login time (fire and forget, don't block session)
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch((err) => console.error("Failed to update lastLoginAt:", err));
      }
      return session;
    },
    async signIn({ user }) {
      // First user becomes admin (fallback if ADMIN_EMAILS not set)
      const userCount = await prisma.user.count();
      if (userCount === 1 && user.email) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
};
