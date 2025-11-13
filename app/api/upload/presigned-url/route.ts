import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { unauthorized, badRequest, handleApiError } from "@/lib/api-errors";
import { getPresignedUploadUrl, generateStorageKey } from "@/lib/s3";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitExceeded } from "@/lib/api-errors";
import {
  MAX_FILE_SIZES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  PRESIGNED_URL
} from "@/lib/constants";
import { logger } from "@/lib/logger";

/**
 * Generate presigned URL for direct S3 upload
 * POST /api/upload/presigned-url
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const session = await getSession();
    if (!session?.user) {
      return unauthorized();
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(session.user.id, "upload");
    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      return rateLimitExceeded(retryAfter);
    }

    // Parse request body
    const body = await req.json();
    const { filename, contentType, fileSize } = body;

    // Validate required fields
    if (!filename || !contentType || !fileSize) {
      return badRequest("Missing required fields: filename, contentType, fileSize");
    }

    // Determine file type and validate
    const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(contentType);

    if (!isImage && !isAudio) {
      return badRequest(
        `Invalid file type. Allowed types: ${[...ALLOWED_AUDIO_TYPES, ...ALLOWED_IMAGE_TYPES].join(", ")}`
      );
    }

    // Validate file size based on type
    const maxSize = isImage ? MAX_FILE_SIZES.COVER_ART : MAX_FILE_SIZES.AUDIO;
    if (fileSize > maxSize) {
      return badRequest(
        `File size exceeds maximum allowed (${maxSize / (1024 * 1024)}MB)`
      );
    }

    // Generate server-controlled storage key (security: client doesn't choose key)
    const prefix = isImage ? "covers" : "mixes";
    const storageKey = generateStorageKey(session.user.id, filename, prefix);

    // Generate presigned URL for PUT operation
    const presignedUrl = await getPresignedUploadUrl(
      storageKey,
      contentType,
      PRESIGNED_URL.UPLOAD_EXPIRY
    );

    logger.info(
      {
        operation: "generate_presigned_url",
        userId: session.user.id,
        storageKey,
        fileSize,
        contentType,
        fileType: isImage ? "cover_art" : "audio",
      },
      `Generated presigned upload URL for ${isImage ? "cover art" : "audio"}`
    );

    return NextResponse.json({
      presignedUrl,
      storageKey,
      expiresIn: PRESIGNED_URL.UPLOAD_EXPIRY,
    });
  } catch (error) {
    return handleApiError(error, "generate_presigned_url", 500);
  }
}
