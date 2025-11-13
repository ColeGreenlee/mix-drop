import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { unauthorized, badRequest, handleApiError } from "@/lib/api-errors";
import { verifyS3Object, deleteFromS3 } from "@/lib/s3";
import { cacheDeletePattern } from "@/lib/cache";
import { generateWaveformPeaks } from "@/lib/waveform";
import { logger, logError } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Finalize S3 upload and create database record
 * POST /api/upload/finalize
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const session = await getSession();
    if (!session?.user) {
      return unauthorized();
    }

    // Parse request body
    const body = await req.json();
    const { storageKey, title, artist, description, duration, isPublic, coverArtKey } = body;

    // Validate required fields
    if (!storageKey || !title || !duration) {
      return badRequest("Missing required fields: storageKey, title, duration");
    }

    // Verify the S3 object exists
    const s3Object = await verifyS3Object(storageKey);
    if (!s3Object) {
      return badRequest("Audio file not found in storage. Upload may have failed.");
    }

    // Validate file size from S3 metadata
    if (!s3Object.size || s3Object.size === 0) {
      return badRequest("Invalid file: size is 0 bytes");
    }

    // Generate placeholder waveform peaks (500 samples)
    // Note: In production, consider using actual audio analysis
    const waveformPeaks = generateWaveformPeaks(Buffer.alloc(0), 500);

    try {
      // Create Mix record in database
      const mix = await prisma.mix.create({
        data: {
          title,
          artist: artist || "Unknown Artist",
          description: description || null,
          duration: Math.round(duration), // Ensure integer
          fileSize: s3Object.size,
          storageKey,
          coverArtKey: coverArtKey || null,
          waveformPeaks: JSON.stringify(waveformPeaks),
          isPublic: isPublic ?? true,
          uploaderId: session.user.id,
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

      // Invalidate mixes list cache
      await cacheDeletePattern("mixes:list:*");

      logger.info(
        {
          operation: "finalize_upload",
          userId: session.user.id,
          mixId: mix.id,
          storageKey,
          fileSize: s3Object.size,
          duration,
        },
        "Finalized direct S3 upload"
      );

      return NextResponse.json({ mix }, { status: 201 });
    } catch (dbError) {
      // Database creation failed - cleanup S3 object
      logError(dbError, {
        context: "finalize_upload_db_error",
        storageKey,
        userId: session.user.id,
      });

      // Attempt to delete the orphaned S3 object
      try {
        await deleteFromS3(storageKey);
        logger.info(
          { operation: "cleanup_orphaned_upload", storageKey },
          "Cleaned up orphaned S3 object after database error"
        );
      } catch (cleanupError) {
        logError(cleanupError, {
          context: "cleanup_orphaned_upload_failed",
          storageKey,
        });
      }

      throw dbError; // Re-throw to be caught by outer error handler
    }
  } catch (error) {
    return handleApiError(error, "finalize_upload", 500);
  }
}
