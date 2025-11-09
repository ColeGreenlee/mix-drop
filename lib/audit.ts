import prisma from "./prisma";

/**
 * Audit logging utility for admin actions
 */

export async function createAuditLog(
  action: string,
  actorId: string,
  targetId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        targetId: targetId || null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging failure shouldn't break the actual operation
  }
}

// Predefined audit actions for consistency
export const AUDIT_ACTIONS = {
  USER_ROLE_CHANGE: "user.role.change",
  USER_STATUS_CHANGE: "user.status.change",
  USER_DELETE: "user.delete",
  MIX_DELETE: "mix.delete",
  PLAYLIST_DELETE: "playlist.delete",
  SETTING_UPDATE: "setting.update",
} as const;
