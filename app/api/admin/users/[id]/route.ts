import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { logError } from "@/lib/logger";
import prisma from "@/lib/prisma";

// GET /api/admin/users/[id] - Get user details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mixes: true,
            playlists: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate storage used
    const storageResult = await prisma.mix.aggregate({
      where: { uploaderId: id },
      _sum: { fileSize: true },
    });

    return NextResponse.json({
      ...user,
      storageUsed: storageResult._sum.fileSize || 0,
    });
  } catch (error) {
    logError(error, { operation: "fetch_user_details", userId: (await params).id });
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { role, status } = await req.json();

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true, status: true, email: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent demoting last admin
    if (role && currentUser.role === "admin" && role !== "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last admin" },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(status && { status }),
      },
    });

    // Audit log
    if (role && role !== currentUser.role) {
      await createAuditLog(AUDIT_ACTIONS.USER_ROLE_CHANGE, session.user.id, id, {
        oldRole: currentUser.role,
        newRole: role,
        targetEmail: currentUser.email,
      });
    }

    if (status && status !== currentUser.status) {
      await createAuditLog(
        AUDIT_ACTIONS.USER_STATUS_CHANGE,
        session.user.id,
        id,
        {
          oldStatus: currentUser.status,
          newStatus: status,
          targetEmail: currentUser.email,
        }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    logError(error, { operation: "update_user", userId: (await params).id });
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (ban)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting last admin
    if (user.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin" },
          { status: 400 }
        );
      }
    }

    // Soft delete by setting status to banned
    await prisma.user.update({
      where: { id },
      data: { status: "banned" },
    });

    // Audit log
    await createAuditLog(AUDIT_ACTIONS.USER_DELETE, session.user.id, id, {
      targetEmail: user.email,
      targetRole: user.role,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, { operation: "delete_user", userId: (await params).id });
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
