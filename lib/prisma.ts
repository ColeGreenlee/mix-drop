import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { logger } from "./logger";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "event" },
      { level: "warn", emit: "event" },
    ],
  });

  // Log database queries with timing
  client.$on("query", (e: Prisma.QueryEvent) => {
    logger.debug(
      {
        database: {
          query: e.query,
          params: e.params,
          duration: e.duration,
          target: e.target,
        },
      },
      `DB Query: ${e.target} - ${e.duration}ms`
    );
  });

  // Log database errors
  client.$on("error", (e: Prisma.LogEvent) => {
    logger.error(
      {
        database: {
          message: e.message,
          target: e.target,
        },
      },
      `DB Error: ${e.message}`
    );
  });

  // Log database warnings
  client.$on("warn", (e: Prisma.LogEvent) => {
    logger.warn(
      {
        database: {
          message: e.message,
          target: e.target,
        },
      },
      `DB Warning: ${e.message}`
    );
  });

  return client;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
