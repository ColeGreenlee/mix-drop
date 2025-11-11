import { beforeAll, afterAll } from "vitest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  GenericContainer,
  StartedTestContainer,
  Wait,
} from "testcontainers";
import { execSync } from "child_process";
import prisma from "@/lib/prisma";

/**
 * Integration test setup with Docker containers
 * Starts PostgreSQL, Redis, and MinIO containers for testing
 */

let postgresContainer: StartedPostgreSqlContainer;
let redisContainer: StartedTestContainer;
let minioContainer: StartedTestContainer;

/**
 * Start all test containers before running integration tests
 */
beforeAll(async () => {
  console.log("🐳 Starting test containers...");

  try {
    // Start PostgreSQL
    console.log("  ⏳ Starting PostgreSQL...");
    postgresContainer = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("mixdrop_test")
      .withUsername("test")
      .withPassword("test")
      .withExposedPorts(5432)
      .start();

    const databaseUrl = postgresContainer.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    console.log(`  ✅ PostgreSQL started at ${databaseUrl}`);

    // Run Prisma migrations
    console.log("  ⏳ Running Prisma migrations...");
    execSync("pnpm prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });
    console.log("  ✅ Migrations completed");

    // Note: Prisma client is already generated globally, no need to regenerate
    // This avoids file locking issues on Windows

    // Start Redis
    console.log("  ⏳ Starting Redis...");
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
      .start();

    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);
    process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

    console.log(`  ✅ Redis started at redis://${redisHost}:${redisPort}`);

    // Start MinIO (S3-compatible storage)
    console.log("  ⏳ Starting MinIO...");
    minioContainer = await new GenericContainer("minio/minio:latest")
      .withCommand(["server", "/data"])
      .withEnvironment({
        MINIO_ROOT_USER: "minioadmin",
        MINIO_ROOT_PASSWORD: "minioadmin",
      })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forLogMessage("API:"))
      .start();

    const minioHost = minioContainer.getHost();
    const minioPort = minioContainer.getMappedPort(9000);
    const minioEndpoint = `http://${minioHost}:${minioPort}`;

    process.env.S3_ENDPOINT = minioEndpoint;
    process.env.S3_PUBLIC_ENDPOINT = minioEndpoint;
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_ACCESS_KEY = "minioadmin";
    process.env.S3_SECRET_KEY = "minioadmin";
    process.env.S3_REGION = "us-east-1";

    console.log(`  ✅ MinIO started at ${minioEndpoint}`);

    // Create S3 bucket
    // Note: In a real setup, you'd use AWS SDK to create the bucket
    // For now, we'll assume the bucket is created or handle it in tests

    console.log("✅ All test containers ready!");
  } catch (error) {
    console.error("❌ Failed to start test containers:", error);
    throw error;
  }
}, 120000); // 2 minute timeout for container startup

/**
 * Stop all test containers after tests complete
 */
afterAll(async () => {
  console.log("🧹 Cleaning up test containers...");

  try {
    // Disconnect Prisma
    await prisma.$disconnect();

    // Stop containers
    if (postgresContainer) {
      await postgresContainer.stop();
      console.log("  ✅ PostgreSQL stopped");
    }

    if (redisContainer) {
      await redisContainer.stop();
      console.log("  ✅ Redis stopped");
    }

    if (minioContainer) {
      await minioContainer.stop();
      console.log("  ✅ MinIO stopped");
    }

    console.log("✅ Cleanup complete");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  }
}, 60000); // 1 minute timeout for cleanup

/**
 * Helper to clear database between tests
 */
export async function clearTestDatabase() {
  await prisma.playlistMix.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.mix.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Helper to seed test data
 */
export async function seedTestData(data: {
  users?: any[];
  mixes?: any[];
  playlists?: any[];
}) {
  if (data.users) {
    await prisma.user.createMany({ data: data.users });
  }

  if (data.mixes) {
    await prisma.mix.createMany({ data: data.mixes });
  }

  if (data.playlists) {
    await prisma.playlist.createMany({ data: data.playlists });
  }
}
