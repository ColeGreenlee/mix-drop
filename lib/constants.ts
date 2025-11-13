/**
 * Application-wide constants
 * Single source of truth for magic numbers and configuration values
 */

// File Upload Limits
export const MAX_FILE_SIZES = {
  AUDIO: 200 * 1024 * 1024, // 200MB
  COVER_ART: 10 * 1024 * 1024, // 10MB
} as const;

// Allowed File Types
export const ALLOWED_MIME_TYPES = {
  AUDIO: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
  ] as const,
  IMAGES: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

// Convenience exports
export const ALLOWED_AUDIO_TYPES = ALLOWED_MIME_TYPES.AUDIO;
export const ALLOWED_IMAGE_TYPES = ALLOWED_MIME_TYPES.IMAGES;

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  MIXES_LIST: 300, // 5 minutes
  MIX_DETAIL: 3600, // 1 hour
  STREAM_URL: 1800, // 30 minutes
  WAVEFORM_PEAKS: 86400, // 24 hours
  PUBLIC_SETTINGS: 300, // 5 minutes
} as const;

// S3 Presigned URLs (in seconds)
export const PRESIGNED_URL = {
  UPLOAD_EXPIRY: 900, // 15 minutes - time client has to complete upload
  DOWNLOAD_EXPIRY: 3600, // 1 hour - time stream URL is valid
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  UPLOAD: {
    MAX_REQUESTS: 5,
    WINDOW_SECONDS: 3600, // 1 hour
  },
  API: {
    MAX_REQUESTS: 100,
    WINDOW_SECONDS: 60, // 1 minute
  },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Input Validation
export const INPUT_LIMITS = {
  TITLE_MAX_LENGTH: 200,
  ARTIST_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 2000,
  PLAYLIST_NAME_MAX_LENGTH: 100,
  PLAYLIST_DESCRIPTION_MAX_LENGTH: 1000,
} as const;

// Waveform
export const WAVEFORM = {
  DEFAULT_SAMPLES: 500,
  CARD_HEIGHT: 24,
  PLAYER_HEIGHT: 60,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "You must be signed in to perform this action",
  FORBIDDEN: "You don't have permission to perform this action",
  NOT_FOUND: "The requested resource was not found",
  FILE_TOO_LARGE: "File size exceeds maximum allowed",
  INVALID_FILE_TYPE: "File type not supported",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later",
  SERVER_ERROR: "An error occurred. Please try again",
} as const;
