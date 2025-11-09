import { NextRequest, NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";
import { getSession } from "@/lib/auth-helpers";
import { uploadToS3, generateStorageKey } from "@/lib/s3";
import { generateWaveformPeaks } from "@/lib/waveform";
import { cacheDeletePattern } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger, logError } from "@/lib/logger";
import {
  MAX_FILE_SIZES,
  ALLOWED_MIME_TYPES,
  INPUT_LIMITS,
  ERROR_MESSAGES,
  WAVEFORM,
} from "@/lib/constants";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(session.user.id, "upload");
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          },
        }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const coverArt = formData.get("coverArt") as File | null;
    const rawTitle = formData.get("title") as string;
    const rawArtist = formData.get("artist") as string;
    const rawDescription = formData.get("description") as string | null;
    const isPublic = formData.get("isPublic") === "on";

    if (!audioFile || !rawTitle || !rawArtist) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sanitize and validate inputs
    const title = rawTitle.trim().slice(0, INPUT_LIMITS.TITLE_MAX_LENGTH);
    const artist = rawArtist.trim().slice(0, INPUT_LIMITS.ARTIST_MAX_LENGTH);
    const description = rawDescription
      ? rawDescription.trim().slice(0, INPUT_LIMITS.DESCRIPTION_MAX_LENGTH)
      : null;

    if (!title || !artist) {
      return NextResponse.json(
        { error: "Title and artist cannot be empty" },
        { status: 400 }
      );
    }

    // Validate audio file size
    if (audioFile.size > MAX_FILE_SIZES.AUDIO) {
      return NextResponse.json(
        {
          error: `${ERROR_MESSAGES.FILE_TOO_LARGE}. Maximum audio file size is ${MAX_FILE_SIZES.AUDIO / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
    }

    // Validate audio file type
    if (!(ALLOWED_MIME_TYPES.AUDIO as readonly string[]).includes(audioFile.type)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_FILE_TYPE },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Generate storage keys
    const audioKey = generateStorageKey(
      session.user.id,
      audioFile.name,
      "mixes"
    );

    // Upload audio file to S3
    await uploadToS3(audioKey, audioBuffer, audioFile.type);

    // Handle cover art if provided
    let coverArtKey: string | null = null;
    if (coverArt && coverArt.size > 0) {
      // Validate cover art file size
      if (coverArt.size > MAX_FILE_SIZES.COVER_ART) {
        return NextResponse.json(
          {
            error: `${ERROR_MESSAGES.FILE_TOO_LARGE}. Maximum cover art size is ${MAX_FILE_SIZES.COVER_ART / 1024 / 1024}MB`,
          },
          { status: 413 }
        );
      }

      // Validate cover art file type
      if (!(ALLOWED_MIME_TYPES.IMAGES as readonly string[]).includes(coverArt.type)) {
        return NextResponse.json(
          { error: ERROR_MESSAGES.INVALID_FILE_TYPE },
          { status: 400 }
        );
      }

      const coverBuffer = Buffer.from(await coverArt.arrayBuffer());
      coverArtKey = generateStorageKey(
        session.user.id,
        coverArt.name,
        "covers"
      );
      await uploadToS3(coverArtKey, coverBuffer, coverArt.type);
    }

    // Generate waveform peaks for visualization
    const waveformPeaks = generateWaveformPeaks(audioBuffer, WAVEFORM.DEFAULT_SAMPLES);

    // Extract audio duration from metadata
    let duration = 0;
    try {
      const metadata = await parseBuffer(audioBuffer, { mimeType: audioFile.type });
      duration = Math.floor(metadata.format.duration || 0);
    } catch (error) {
      logError(error, { operation: "extract_audio_metadata", filename: audioFile.name });
      // Continue with duration = 0 rather than failing the upload
    }

    // Create mix record in database
    const mix = await prisma.mix.create({
      data: {
        title,
        artist,
        description: description || null,
        duration,
        fileSize: audioFile.size,
        storageKey: audioKey,
        coverArtKey,
        waveformPeaks: JSON.stringify(waveformPeaks),
        isPublic,
        uploaderId: session.user.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Invalidate mixes list cache
    await cacheDeletePattern("mixes:list:*");

    logger.info(
      { upload: { mixId: mix.id, title, artist, fileSize: audioFile.size } },
      "Mix uploaded successfully"
    );

    return NextResponse.json({
      success: true,
      mix,
    });
  } catch (error) {
    logError(error, { operation: "upload_mix" });
    return NextResponse.json(
      { error: "Failed to upload mix" },
      { status: 500 }
    );
  }
}
