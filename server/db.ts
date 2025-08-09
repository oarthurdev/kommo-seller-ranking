import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const prisma = new PrismaClient().$extends(
  withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY }),
);

export { prisma };
