import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

// POST /api/playlists/[id]/mixes - Add mix to playlist
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mixId } = await req.json();

    if (!mixId) {
      return NextResponse.json(
        { error: "Mix ID is required" },
        { status: 400 }
      );
    }

    // Check playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check mix exists
    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
    });

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    // Get current max order
    const maxOrder = await prisma.playlistMix.aggregate({
      where: { playlistId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // Add mix to playlist
    const playlistMix = await prisma.playlistMix.create({
      data: {
        playlistId,
        mixId,
        order: nextOrder,
      },
    });

    return NextResponse.json({ success: true, playlistMix });
  } catch (error) {
    // Handle unique constraint violation (mix already in playlist)
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Mix already in playlist" },
        { status: 400 }
      );
    }

    console.error("Failed to add mix to playlist:", error);
    return NextResponse.json(
      { error: "Failed to add mix to playlist" },
      { status: 500 }
    );
  }
}

// DELETE /api/playlists/[id]/mixes - Remove mix from playlist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mixId = searchParams.get("mixId");

    if (!mixId) {
      return NextResponse.json(
        { error: "Mix ID is required" },
        { status: 400 }
      );
    }

    // Check playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove mix from playlist
    await prisma.playlistMix.deleteMany({
      where: {
        playlistId,
        mixId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove mix from playlist:", error);
    return NextResponse.json(
      { error: "Failed to remove mix from playlist" },
      { status: 500 }
    );
  }
}
