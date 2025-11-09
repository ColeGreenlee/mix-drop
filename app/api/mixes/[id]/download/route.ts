import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mix = await prisma.mix.findUnique({
      where: { id },
      select: {
        storageKey: true,
        title: true,
        artist: true,
        isPublic: true,
      },
    });

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    // Generate download URL with proper content-disposition
    const downloadUrl = `${process.env.S3_PUBLIC_ENDPOINT}/${process.env.S3_BUCKET}/${mix.storageKey}`;

    // Create filename from title and artist
    const filename = `${mix.artist} - ${mix.title}.mp3`
      .replace(/[^a-z0-9\s\-_.]/gi, '') // Remove special chars
      .replace(/\s+/g, '_'); // Replace spaces with underscores

    // Return the download URL
    // The browser will download via the S3 URL directly
    return NextResponse.json({
      url: downloadUrl,
      filename,
    });
  } catch (error) {
    logError(error, { operation: "generate_download_url", mixId: (await params).id });
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
