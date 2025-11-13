import { faker } from "@faker-js/faker";
import type { User, Mix, Playlist, PlaylistMix } from "@prisma/client";

/**
 * Test data factories for generating mock data
 * Use these to create consistent test fixtures
 */

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  image: faker.image.avatar(),
  role: "user",
  status: "active",
  emailVerified: faker.date.past(),
  lastLoginAt: faker.date.recent(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const createMockAdmin = (overrides?: Partial<User>): User =>
  createMockUser({ role: "admin", ...overrides });

export const createMockMix = (overrides?: Partial<Mix>): Mix => ({
  id: faker.string.uuid(),
  title: faker.music.songName(),
  artist: faker.person.fullName(),
  description: faker.lorem.paragraph(),
  uploaderId: faker.string.uuid(),
  storageKey: `mixes/${faker.string.uuid()}/${faker.system.fileName()}`,
  coverArtKey: `covers/${faker.string.uuid()}/${faker.system.fileName()}`,
  duration: faker.number.int({ min: 60, max: 7200 }), // 1 min to 2 hours
  fileSize: faker.number.int({ min: 1000000, max: 100000000 }), // 1MB to 100MB
  waveformPeaks: JSON.stringify(
    Array.from({ length: 500 }, () => faker.number.float({ min: 0, max: 1 }))
  ),
  isPublic: true,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const createMockPlaylist = (overrides?: Partial<Playlist>): Playlist => ({
  id: faker.string.uuid(),
  name: faker.music.genre() + " Playlist",
  description: faker.lorem.sentence(),
  userId: faker.string.uuid(),
  isPublic: true,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const createMockPlaylistMix = (
  overrides?: Partial<PlaylistMix>
): PlaylistMix => ({
  id: faker.string.uuid(),
  playlistId: faker.string.uuid(),
  mixId: faker.string.uuid(),
  order: faker.number.int({ min: 0, max: 100 }),
  addedAt: faker.date.past(),
  ...overrides,
});

/**
 * Create multiple mock entities
 */
export const createMockUsers = (count: number, overrides?: Partial<User>): User[] =>
  Array.from({ length: count }, () => createMockUser(overrides));

export const createMockMixes = (count: number, overrides?: Partial<Mix>): Mix[] =>
  Array.from({ length: count }, () => createMockMix(overrides));

export const createMockPlaylists = (
  count: number,
  overrides?: Partial<Playlist>
): Playlist[] =>
  Array.from({ length: count }, () => createMockPlaylist(overrides));

/**
 * Audio file buffers for testing uploads
 */
export const createMockAudioBuffer = (sizeInBytes = 1000000): Buffer => {
  return Buffer.alloc(sizeInBytes);
};

export const createMockImageBuffer = (sizeInBytes = 100000): Buffer => {
  return Buffer.alloc(sizeInBytes);
};

/**
 * Mock FormData for file uploads
 */
export const createMockFormData = (overrides?: {
  audioFile?: File;
  coverImage?: File;
  title?: string;
  artist?: string;
  description?: string;
  isPublic?: string;
}): FormData => {
  const formData = new FormData();

  const audioFile =
    overrides?.audioFile ||
    new File([createMockAudioBuffer() as unknown as BlobPart], "test-mix.mp3", {
      type: "audio/mpeg",
    });

  const coverImage =
    overrides?.coverImage ||
    new File([createMockImageBuffer() as unknown as BlobPart], "cover.jpg", {
      type: "image/jpeg",
    });

  formData.append("audio", audioFile);
  formData.append("cover", coverImage);
  formData.append("title", overrides?.title || faker.music.songName());
  formData.append("artist", overrides?.artist || faker.person.fullName());
  formData.append("description", overrides?.description || faker.lorem.paragraph());
  formData.append("isPublic", overrides?.isPublic || "true");

  return formData;
};
