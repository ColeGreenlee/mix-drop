import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { Adapter } from "next-auth/adapters";
import { logError, logAuth } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    // Local credentials authentication (enabled in development)
    ...(process.env.ENABLE_LOCAL_AUTH === "true"
      ? [
          CredentialsProvider({
            id: "credentials",
            name: "Local Account",
            credentials: {
              username: { label: "Username or Email", type: "text", placeholder: "admin" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (!credentials?.username || !credentials?.password) {
                return null;
              }

              // Find user by email or username
              const user = await prisma.user.findFirst({
                where: {
                  OR: [
                    { email: credentials.username },
                    { username: credentials.username },
                  ],
                },
              });

              if (!user || !user.hashedPassword) {
                return null; // User not found or OAuth-only user
              }

              // Verify password
              const isValid = await bcrypt.compare(
                credentials.password,
                user.hashedPassword
              );

              if (!isValid) {
                return null;
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
              };
            },
          }),
        ]
      : []),

    // OAuth SSO provider (disabled for local dev, enable in production)
    // Uncomment for production OAuth SSO:
    /*
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
    */
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
        token.status = (user as { status?: string }).status || "active";

        // Update last login time
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .then(() => logAuth('jwt_created', user.id))
          .catch((err) => logError(err, { auth: { event: 'update_lastLoginAt', userId: user.id } }));
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
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

      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt", // Required for CredentialsProvider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
