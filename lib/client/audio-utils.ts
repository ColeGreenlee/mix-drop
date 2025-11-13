/**
 * Client-side audio utilities for extracting metadata
 * Uses HTML5 Audio API (browser only)
 */

/**
 * Extract audio duration from a File object using HTML5 Audio API
 * @param file - The audio file to analyze
 * @returns Promise<number> - Duration in seconds
 * @throws Error if duration cannot be extracted or file is invalid
 */
export async function extractAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    // Create temporary object URL for the file
    const objectUrl = URL.createObjectURL(file);

    // Create audio element
    const audio = new Audio();

    // Cleanup function
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.remove();
    };

    // Set up event listeners
    audio.addEventListener("loadedmetadata", () => {
      // Check if duration is valid
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        cleanup();
        resolve(audio.duration);
      } else {
        cleanup();
        reject(new Error("Invalid audio duration"));
      }
    });

    audio.addEventListener("error", () => {
      cleanup();
      reject(new Error("Failed to load audio file. File may be corrupted or unsupported."));
    });

    // Set timeout to prevent hanging
    setTimeout(() => {
      cleanup();
      reject(new Error("Audio duration extraction timed out"));
    }, 10000); // 10 second timeout

    // Start loading the audio
    audio.src = objectUrl;
    audio.load();
  });
}

/**
 * Validate audio file before upload
 * @param file - The audio file to validate
 * @param maxSize - Maximum file size in bytes
 * @param allowedTypes - Array of allowed MIME types
 * @returns Object with validation result and error message
 */
export function validateAudioFile(
  file: File,
  maxSize: number,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  // Check file exists
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "15.3 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "3:45")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
