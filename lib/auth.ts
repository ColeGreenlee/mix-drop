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
        return {
          id: profile.sub || profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture || profile.avatar_url,
          role: "user", // Default role for new users
        };
      },
    },
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: string }).role || "user";
      }
      return session;
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
