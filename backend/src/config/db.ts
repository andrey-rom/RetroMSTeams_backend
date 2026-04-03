import { PrismaClient } from "../generated/prisma/client.js";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  const g = globalThis as unknown as { __prisma?: PrismaClient };
  if (!g.__prisma) {
    g.__prisma = new PrismaClient({
      log: ["warn", "error"],
    });
  }
  prisma = g.__prisma;
}

export { prisma };
