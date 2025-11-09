import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

// GET /api/playlists - List playlists (user's own + public ones)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Build where clause
    let where:
      | { userId?: string; isPublic?: boolean }
      | { OR: Array<{ userId?: string; isPublic?: boolean }> } = {};

    if (userId) {
      // Filter by specific user - show their public playlists
      // Or all playlists if viewing own profile
      if (session?.user?.id === userId) {
        where = { userId };
      } else {
        where = { userId, isPublic: true };
      }
    } else if (session?.user) {
      // Show user's own playlists + all public playlists
      where = {
        OR: [
          { userId: session.user.id },
          { isPublic: true },
        ],
      };
    } else {
      // Unauthenticated: only public playlists
      where = { isPublic: true };
    }

    const playlists = await prisma.playlist.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: { mixes: true },
        },
      },
    });

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Failed to fetch playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

// POST /api/playlists - Create new playlist
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, isPublic } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Playlist name is required" },
        { status: 400 }
      );
    }

    const playlist = await prisma.playlist.create({
      data: {
        name,
        description: description || null,
        isPublic: isPublic ?? false,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: { mixes: true },
        },
      },
    });

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error("Failed to create playlist:", error);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
