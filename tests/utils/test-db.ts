import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

/**
 * Test database utilities for integration tests
 * Handles test database lifecycle and cleanup
 */

let prismaClient: PrismaClient | undefined;

/**
 * Get or create Prisma client for tests
 */
export const getTestPrismaClient = (): PrismaClient => {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test",
        },
      },
    });
  }
  return prismaClient;
};

/**
 * Run database migrations for test database
 */
export const runMigrations = async (): Promise<void> => {
  try {
    execSync("npx prisma migrate deploy", {
      env: {
        ...process.env,
        DATABASE_URL:
          process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test",
      },
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to run migrations:", error);
    throw error;
  }
};

/**
 * Clear all tables in the test database
 * Useful for cleaning up between tests
 */
export const clearDatabase = async (): Promise<void> => {
  const prisma = getTestPrismaClient();

  // Delete in order to respect foreign key constraints
  await prisma.playlistMix.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.mix.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
};

/**
 * Disconnect from test database
 */
export const disconnectTestDb = async (): Promise<void> => {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = undefined;
  }
};

/**
 * Seed test database with basic data
 */
export const seedTestDatabase = async (data?: {
  users?: any[];
  mixes?: any[];
  playlists?: any[];
}): Promise<void> => {
  const prisma = getTestPrismaClient();

  if (data?.users) {
    await prisma.user.createMany({ data: data.users });
  }

  if (data?.mixes) {
    await prisma.mix.createMany({ data: data.mixes });
  }

  if (data?.playlists) {
    await prisma.playlist.createMany({ data: data.playlists });
  }
};

/**
 * Execute a function within a database transaction
 * Automatically rolls back after test
 */
export const withTransaction = async <T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  const prisma = getTestPrismaClient();

  return await prisma.$transaction(async (tx) => {
    return await fn(tx as PrismaClient);
  });
};
