import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { cacheGet, cacheSet, CacheKeys } from "@/lib/cache";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const isAuthenticated = !!session?.user;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Parse filter parameters
    const uploaderIds = searchParams.get("uploaders")?.split(",").filter(Boolean) || [];

    // Try cache first (only for unfiltered first page)
    if (page === 1 && uploaderIds.length === 0) {
      const cacheKey = isAuthenticated ? CacheKeys.mixes(1) : `${CacheKeys.mixes(1)}:public`;
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Build where clause based on filters
    const where: { uploaderId?: { in: string[] }; isPublic?: boolean } = {};

    // Only show public mixes to unauthenticated users
    if (!isAuthenticated) {
      where.isPublic = true;
    }

    if (uploaderIds.length > 0) {
      where.uploaderId = { in: uploaderIds };
    }

    const [mixes, total] = await Promise.all([
      prisma.mix.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.mix.count({ where }),
    ]);

    const response = {
      mixes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        uploaders: uploaderIds,
      },
    };

    // Cache the response (5 min TTL for first page, no filters)
    if (page === 1 && uploaderIds.length === 0) {
      const cacheKey = isAuthenticated ? CacheKeys.mixes(1) : `${CacheKeys.mixes(1)}:public`;
      await cacheSet(cacheKey, response, 300); // 5 minutes
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch mixes:", error);
    return NextResponse.json(
      { error: "Failed to fetch mixes" },
      { status: 500 }
    );
  }
}
