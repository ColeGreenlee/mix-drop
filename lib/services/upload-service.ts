import { parseBuffer } from "music-metadata";
import { uploadToS3, generateStorageKey } from "@/lib/s3";
import { generateWaveformPeaks } from "@/lib/waveform";
import { cacheDeletePattern } from "@/lib/cache";
import { logError, logger } from "@/lib/logger";
import {
  MAX_FILE_SIZES,
  ALLOWED_MIME_TYPES,
  INPUT_LIMITS,
  WAVEFORM,
} from "@/lib/constants";
import prisma from "@/lib/prisma";

/**
 * Upload service - handles file upload validation and processing
 * Extracted from API routes for better testability
 */

export interface UploadFileData {
  file: File;
  userId: string;
  type: "audio" | "cover";
}

export interface UploadMixData {
  title: string;
  artist: string;
  description?: string | null;
  isPublic: boolean;
  audioFile: File;
  coverArt?: File | null;
  uploaderId: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  type: "audio" | "cover"
): ValidationError | null {
  const maxSize =
    type === "audio" ? MAX_FILE_SIZES.AUDIO : MAX_FILE_SIZES.COVER_ART;

  if (file.size > maxSize) {
    return {
      field: type === "audio" ? "audio" : "coverArt",
      message: `File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`,
    };
  }

  return null;
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  type: "audio" | "cover"
): ValidationError | null {
  const allowedTypes =
    type === "audio" ? ALLOWED_MIME_TYPES.AUDIO : ALLOWED_MIME_TYPES.IMAGES;

  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return {
      field: type === "audio" ? "audio" : "coverArt",
      message: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  return null;
}

/**
 * Sanitize and validate text input
 */
export function sanitizeInput(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, maxLength);
}

/**
 * Validate mix metadata
 */
export function validateMixMetadata(data: {
  title: string;
  artist: string;
  description?: string | null;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const title = sanitizeInput(data.title, INPUT_LIMITS.TITLE_MAX_LENGTH);
  const artist = sanitizeInput(data.artist, INPUT_LIMITS.ARTIST_MAX_LENGTH);

  if (!title) {
    errors.push({ field: "title", message: "Title is required" });
  }

  if (!artist) {
    errors.push({ field: "artist", message: "Artist is required" });
  }

  return errors;
}

/**
 * Extract audio duration from file buffer
 */
export async function extractAudioDuration(
  buffer: Buffer,
  mimeType: string
): Promise<number> {
  try {
    const metadata = await parseBuffer(buffer, { mimeType });
    return Math.floor(metadata.format.duration || 0);
  } catch (error) {
    logError(error, { operation: "extract_audio_metadata" });
    return 0; // Return 0 instead of failing the upload
  }
}

/**
 * Process and upload a file to S3
 */
export async function processFileUpload(
  data: UploadFileData
): Promise<string> {
  const { file, userId, type } = data;

  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Generate storage key
  const storageKey = generateStorageKey(
    userId,
    file.name,
    type === "audio" ? "mixes" : "covers"
  );

  // Upload to S3
  await uploadToS3(storageKey, buffer, file.type);

  return storageKey;
}

/**
 * Upload a complete mix with audio and optional cover art
 */
export async function uploadMix(data: UploadMixData) {
  const {
    title: rawTitle,
    artist: rawArtist,
    description: rawDescription,
    isPublic,
    audioFile,
    coverArt,
    uploaderId,
  } = data;

  // Sanitize inputs
  const title = sanitizeInput(rawTitle, INPUT_LIMITS.TITLE_MAX_LENGTH);
  const artist = sanitizeInput(rawArtist, INPUT_LIMITS.ARTIST_MAX_LENGTH);
  const description = sanitizeInput(
    rawDescription,
    INPUT_LIMITS.DESCRIPTION_MAX_LENGTH
  );

  // Validate metadata
  const metadataErrors = validateMixMetadata({ title: title || "", artist: artist || "" });
  if (metadataErrors.length > 0) {
    throw new Error(metadataErrors[0].message);
  }

  // Validate audio file
  const audioSizeError = validateFileSize(audioFile, "audio");
  if (audioSizeError) {
    throw new Error(audioSizeError.message);
  }

  const audioTypeError = validateFileType(audioFile, "audio");
  if (audioTypeError) {
    throw new Error(audioTypeError.message);
  }

  // Upload audio file
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  const audioKey = await processFileUpload({
    file: audioFile,
    userId: uploaderId,
    type: "audio",
  });

  // Process cover art if provided
  let coverArtKey: string | null = null;
  if (coverArt && coverArt.size > 0) {
    const coverSizeError = validateFileSize(coverArt, "cover");
    if (coverSizeError) {
      throw new Error(coverSizeError.message);
    }

    const coverTypeError = validateFileType(coverArt, "cover");
    if (coverTypeError) {
      throw new Error(coverTypeError.message);
    }

    coverArtKey = await processFileUpload({
      file: coverArt,
      userId: uploaderId,
      type: "cover",
    });
  }

  // Generate waveform
  const waveformPeaks = generateWaveformPeaks(audioBuffer, WAVEFORM.DEFAULT_SAMPLES);

  // Extract audio duration
  const duration = await extractAudioDuration(audioBuffer, audioFile.type);

  // Create mix in database
  const mix = await prisma.mix.create({
    data: {
      title: title!,
      artist: artist!,
      description,
      duration,
      fileSize: audioFile.size,
      storageKey: audioKey,
      coverArtKey,
      waveformPeaks: JSON.stringify(waveformPeaks),
      isPublic,
      uploaderId,
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

  // Invalidate cache
  await cacheDeletePattern("mixes:list:*");

  logger.info(
    { upload: { mixId: mix.id, title, artist, fileSize: audioFile.size } },
    "Mix uploaded successfully"
  );

  return mix;
}
