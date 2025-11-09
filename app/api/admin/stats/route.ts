import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logError } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    // Get system-wide statistics
    const [
      totalUsers,
      totalMixes,
      totalPlaylists,
      activeUsers,
      adminUsers,
      storageResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.mix.count(),
      prisma.playlist.count(),
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.mix.aggregate({ _sum: { fileSize: true } }),
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentMixes, recentUsers, recentPlaylists] = await Promise.all([
      prisma.mix.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.playlist.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        newThisWeek: recentUsers,
      },
      mixes: {
        total: totalMixes,
        newThisWeek: recentMixes,
      },
      playlists: {
        total: totalPlaylists,
        newThisWeek: recentPlaylists,
      },
      storage: {
        totalBytes: storageResult._sum.fileSize || 0,
        totalMB: Math.round((storageResult._sum.fileSize || 0) / 1024 / 1024),
        totalGB: Math.round((storageResult._sum.fileSize || 0) / 1024 / 1024 / 1024 * 100) / 100,
      },
    });
  } catch (error) {
    logError(error, { operation: "fetch_admin_stats" });
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
