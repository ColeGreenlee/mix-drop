import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logError } from "./logger";

/**
 * S3 Configuration interface for dependency injection
 */
export interface S3Config {
  endpoint?: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicEndpoint?: string;
  forcePathStyle?: boolean;
}

/**
 * Create S3 client with configuration
 * Exported for testing and dependency injection
 */
export function createS3Client(config?: Partial<S3Config>): S3Client {
  const finalConfig: S3Config = {
    endpoint: config?.endpoint || process.env.S3_ENDPOINT,
    region: config?.region || process.env.S3_REGION || "us-east-1",
    accessKeyId: config?.accessKeyId || process.env.S3_ACCESS_KEY!,
    secretAccessKey: config?.secretAccessKey || process.env.S3_SECRET_KEY!,
    bucket: config?.bucket || process.env.S3_BUCKET!,
    publicEndpoint: config?.publicEndpoint || process.env.S3_PUBLIC_ENDPOINT,
    forcePathStyle: config?.forcePathStyle ?? process.env.S3_FORCE_PATH_STYLE === "true",
  };

  return new S3Client({
    endpoint: finalConfig.endpoint,
    region: finalConfig.region,
    credentials: {
      accessKeyId: finalConfig.accessKeyId,
      secretAccessKey: finalConfig.secretAccessKey,
    },
    forcePathStyle: finalConfig.forcePathStyle,
  });
}

// Default S3 client instance (can be overridden in tests)
let defaultS3Client: S3Client | null = null;

/**
 * Get or create the default S3 client
 */
export function getS3Client(): S3Client {
  if (!defaultS3Client) {
    defaultS3Client = createS3Client();
  }
  return defaultS3Client;
}

/**
 * Set custom S3 client (for testing)
 */
export function setS3Client(client: S3Client): void {
  defaultS3Client = client;
}

/**
 * Reset to default S3 client (for testing cleanup)
 */
export function resetS3Client(): void {
  defaultS3Client = null;
}

const BUCKET_NAME = process.env.S3_BUCKET!;
const S3_PUBLIC_ENDPOINT = process.env.S3_PUBLIC_ENDPOINT;

/**
 * Upload a file to S3/MinIO
 * @param key - The object key (path) in the bucket
 * @param body - The file buffer or stream
 * @param contentType - The MIME type of the file
 * @param client - Optional S3 client (for testing)
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  client?: S3Client
): Promise<void> {
  const s3 = client || getS3Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3.send(command);
}

/**
 * Delete a file from S3/MinIO
 * @param key - The object key (path) in the bucket
 * @param client - Optional S3 client (for testing)
 */
export async function deleteFromS3(key: string, client?: S3Client): Promise<void> {
  const s3 = client || getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3.send(command);
}

/**
 * Generate a pre-signed URL for streaming/downloading a file
 * @param key - The object key (path) in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @param client - Optional S3 client (for testing)
 * @returns Pre-signed URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600,
  client?: S3Client
): Promise<string> {
  const s3 = client || getS3Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    // Generate URL using internal endpoint (works server-side)
    const url = await getSignedUrl(s3, command, {
      expiresIn,
      unhoistableHeaders: new Set(["x-amz-content-sha256"]), // Prevent signature issues
    });

    // Replace internal endpoint with public endpoint for browser access
    if (S3_PUBLIC_ENDPOINT && process.env.S3_ENDPOINT) {
      return url.replace(process.env.S3_ENDPOINT, S3_PUBLIC_ENDPOINT);
    }

    return url;
  } catch (error) {
    logError(error, { s3: { operation: "presign", key } });
    throw error;
  }
}

/**
 * Generate a pre-signed URL for uploading a file directly to S3
 * Allows clients to upload files without routing through the server
 * @param key - The object key (path) in the bucket
 * @param contentType - The MIME type of the file to upload
 * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
 * @param client - Optional S3 client (for testing)
 * @returns Pre-signed PUT URL for direct upload
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900, // 15 minutes
  client?: S3Client
): Promise<string> {
  const s3 = client || getS3Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  try {
    // Generate URL using internal endpoint (works server-side)
    const url = await getSignedUrl(s3, command, {
      expiresIn,
      // Only sign the host header - exclude checksum headers that browsers won't send
      signableHeaders: new Set(["host"]),
      unhoistableHeaders: new Set(["x-amz-content-sha256"]),
    });

    // Replace internal endpoint with public endpoint for browser access
    if (S3_PUBLIC_ENDPOINT && process.env.S3_ENDPOINT) {
      return url.replace(process.env.S3_ENDPOINT, S3_PUBLIC_ENDPOINT);
    }

    return url;
  } catch (error) {
    logError(error, { s3: { operation: "presign_upload", key } });
    throw error;
  }
}

/**
 * Verify an S3 object exists and get its metadata
 * @param key - The object key (path) in the bucket
 * @param client - Optional S3 client (for testing)
 * @returns Object metadata or null if not found
 */
export async function verifyS3Object(
  key: string,
  client?: S3Client
): Promise<{ size: number; contentType?: string } | null> {
  const s3 = client || getS3Client();

  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3.send(command);
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType,
    };
  } catch (error) {
    // Object doesn't exist
    return null;
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
