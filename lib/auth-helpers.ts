import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Get the current session or redirect to sign-in page
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return session;
}

/**
 * Get the current session (may be null)
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const session = await getSession();
  return session?.user?.role === "admin";
}

/**
 * Require admin role or redirect
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return session;
}
