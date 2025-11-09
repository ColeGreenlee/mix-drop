import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { deleteFromS3 } from "@/lib/s3";
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern, CacheKeys } from "@/lib/cache";
import { logError } from "@/lib/logger";
import prisma from "@/lib/prisma";

// GET /api/mixes/[id] - Get single mix
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try cache first
    const cached = await cacheGet(CacheKeys.mix(id));
    if (cached) {
      return NextResponse.json(cached);
    }

    const mix = await prisma.mix.findUnique({
      where: { id },
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
    });

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    // Cache the mix (1 hour TTL)
    await cacheSet(CacheKeys.mix(id), mix, 3600);

    return NextResponse.json(mix);
  } catch (error) {
    logError(error, { operation: "fetch_mix", mixId: (await params).id });
    return NextResponse.json(
      { error: "Failed to fetch mix" },
      { status: 500 }
    );
  }
}

// PATCH /api/mixes/[id] - Update mix metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mix = await prisma.mix.findUnique({
      where: { id },
    });

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    // Check if user owns the mix or is admin
    if (mix.uploaderId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, artist, description, isPublic } = await req.json();

    const updatedMix = await prisma.mix.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(artist && { artist }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
      },
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
    });

    // Invalidate caches
    await cacheDelete(CacheKeys.mix(id));
    await cacheDeletePattern("mixes:list:*"); // Invalidate all list caches

    return NextResponse.json(updatedMix);
  } catch (error) {
    logError(error, { operation: "update_mix", mixId: (await params).id });
    return NextResponse.json(
      { error: "Failed to update mix" },
      { status: 500 }
    );
  }
}

// DELETE /api/mixes/[id] - Delete mix
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mix = await prisma.mix.findUnique({
      where: { id },
    });

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    // Check if user owns the mix or is admin
    if (mix.uploaderId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete files from S3
    await deleteFromS3(mix.storageKey);
    if (mix.coverArtKey) {
      await deleteFromS3(mix.coverArtKey);
    }

    // Delete from database
    await prisma.mix.delete({
      where: { id },
    });

    // Invalidate caches
    await cacheDelete(CacheKeys.mix(id));
    await cacheDeletePattern("mixes:list:*");

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, { operation: "delete_mix", mixId: (await params).id });
    return NextResponse.json(
      { error: "Failed to delete mix" },
      { status: 500 }
    );
  }
}
