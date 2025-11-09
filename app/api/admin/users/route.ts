import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role"); // "user", "admin", or null for all
    const status = searchParams.get("status"); // "active", "suspended", "banned", or null for all
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      role?: string;
      status?: string;
      OR?: Array<{ name?: { contains: string }; email?: { contains: string } }>;
    } = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              mixes: true,
              playlists: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate storage for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const storageResult = await prisma.mix.aggregate({
          where: { uploaderId: user.id },
          _sum: { fileSize: true },
        });

        return {
          ...user,
          storageUsed: storageResult._sum.fileSize || 0,
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
