import { prisma } from "../../config/db.js";

export async function findAll() {
  return prisma.templateType.findMany({
    include: {
      values: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { code: "asc" },
  });
}

export async function findByCode(code: string) {
  return prisma.templateType.findUnique({
    where: { code },
    include: {
      values: { orderBy: { sortOrder: "asc" } },
    },
  });
}
