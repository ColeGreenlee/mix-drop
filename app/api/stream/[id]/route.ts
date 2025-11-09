import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mix = await prisma.mix.findUnique({
      where: { id },
      select: { storageKey: true, coverArtKey: true },
    });

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "audio";

    if (type === "cover") {
      if (!mix.coverArtKey) {
        return NextResponse.json({ error: "No cover art" }, { status: 404 });
      }
      // Return direct public URL (bucket is public for development)
      const url = `${process.env.S3_PUBLIC_ENDPOINT}/${process.env.S3_BUCKET}/${mix.coverArtKey}`;
      return NextResponse.json({ url });
    }

    // Default to audio - return direct public URL
    const url = `${process.env.S3_PUBLIC_ENDPOINT}/${process.env.S3_BUCKET}/${mix.storageKey}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to generate stream URL:", error);
    return NextResponse.json(
      { error: "Failed to generate stream URL" },
      { status: 500 }
    );
  }
}
