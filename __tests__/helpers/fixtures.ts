import { User, Mix, Playlist } from "@prisma/client";

/**
 * Test data fixtures for consistent testing
 */

export const mockUsers = {
  regularUser: {
    id: "user-1",
    email: "user@test.com",
    name: "Regular User",
    username: "regularuser",
    hashedPassword: null,
    emailVerified: new Date(),
    image: null,
    role: "user" as const,
    status: "active" as const,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  } as User,

  adminUser: {
    id: "admin-1",
    email: "admin@test.com",
    name: "Admin User",
    username: "adminuser",
    hashedPassword: null,
    emailVerified: new Date(),
    image: null,
    role: "admin" as const,
    status: "active" as const,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  } as User,

  suspendedUser: {
    id: "user-2",
    email: "suspended@test.com",
    name: "Suspended User",
    username: "suspendeduser",
    hashedPassword: null,
    emailVerified: new Date(),
    image: null,
    role: "user" as const,
    status: "suspended" as const,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  } as User,
};

export const mockMixes = {
  publicMix: {
    id: "mix-1",
    title: "Test Mix 1",
    artist: "Test Artist",
    description: "A test mix",
    duration: 3600,
    fileSize: 50000000,
    storageKey: "mixes/user-1/test-mix-1.mp3",
    coverArtKey: null,
    waveformPeaks: JSON.stringify([[0.5, 0.7, 0.3], [0.5, 0.7, 0.3]]),
    uploaderId: "user-1",
    isPublic: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  } as Mix,

  privateMix: {
    id: "mix-2",
    title: "Private Mix",
    artist: "Test Artist",
    description: "A private test mix",
    duration: 2400,
    fileSize: 30000000,
    storageKey: "mixes/user-1/test-mix-2.mp3",
    coverArtKey: "covers/user-1/cover.jpg",
    waveformPeaks: JSON.stringify([[0.4, 0.6, 0.2], [0.4, 0.6, 0.2]]),
    uploaderId: "user-1",
    isPublic: false,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  } as Mix,

  adminMix: {
    id: "mix-3",
    title: "Admin Mix",
    artist: "Admin Artist",
    description: "Mix uploaded by admin",
    duration: 4800,
    fileSize: 60000000,
    storageKey: "mixes/admin-1/admin-mix.mp3",
    coverArtKey: null,
    waveformPeaks: JSON.stringify([[0.8, 0.9, 0.7], [0.8, 0.9, 0.7]]),
    uploaderId: "admin-1",
    isPublic: true,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
  } as Mix,
};

export const mockPlaylists = {
  publicPlaylist: {
    id: "playlist-1",
    name: "Public Playlist",
    description: "A public test playlist",
    userId: "user-1",
    isPublic: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  } as Playlist,

  privatePlaylist: {
    id: "playlist-2",
    name: "Private Playlist",
    description: "A private test playlist",
    userId: "user-1",
    isPublic: false,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
  } as Playlist,
};

/**
 * Helper to create a mock audio buffer
 */
export function createMockAudioBuffer(size: number = 1000): Buffer {
  const buffer = Buffer.alloc(size);
  // Fill with pseudo-random data
  for (let i = 0; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

/**
 * Helper to create mock form data for file uploads
 */
export function createMockFormData(overrides?: {
  audioFile?: File;
  coverArt?: File;
  title?: string;
  artist?: string;
  description?: string;
  isPublic?: string;
}): FormData {
  const formData = new FormData();

  if (overrides?.audioFile) {
    formData.append("audioFile", overrides.audioFile);
  }

  if (overrides?.coverArt) {
    formData.append("coverArt", overrides.coverArt);
  }

  formData.append("title", overrides?.title || "Test Mix");
  formData.append("artist", overrides?.artist || "Test Artist");
  formData.append("description", overrides?.description || "Test description");
  formData.append("isPublic", overrides?.isPublic || "true");

  return formData;
}
