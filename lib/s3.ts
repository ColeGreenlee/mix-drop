import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client with configuration from environment variables
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", // Required for MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET!;
const S3_PUBLIC_ENDPOINT = process.env.S3_PUBLIC_ENDPOINT;

/**
 * Upload a file to S3/MinIO
 * @param key - The object key (path) in the bucket
 * @param body - The file buffer or stream
 * @param contentType - The MIME type of the file
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Delete a file from S3/MinIO
 * @param key - The object key (path) in the bucket
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate a pre-signed URL for streaming/downloading a file
 * @param key - The object key (path) in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Pre-signed URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    // Generate URL using internal endpoint (works server-side)
    const url = await getSignedUrl(s3Client, command, {
      expiresIn,
      unhoistableHeaders: new Set(["x-amz-content-sha256"]), // Prevent signature issues
    });

    // Replace internal endpoint with public endpoint for browser access
    if (S3_PUBLIC_ENDPOINT && process.env.S3_ENDPOINT) {
      return url.replace(process.env.S3_ENDPOINT, S3_PUBLIC_ENDPOINT);
    }

    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

/**
 * Generate a unique storage key for a file
 * @param userId - The user's ID
 * @param filename - The original filename
 * @param prefix - Optional prefix (e.g., 'mixes' or 'covers')
 * @returns Unique storage key
 */
export function generateStorageKey(
  userId: string,
  filename: string,
  prefix: string = "mixes"
): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const ext = filename.split(".").pop();
  return `${prefix}/${userId}/${timestamp}-${randomStr}.${ext}`;
}
