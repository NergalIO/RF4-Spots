import { prisma } from "../../lib/prisma.js";

export async function enabledAdminCount(exceptId?: string) {
  return prisma.user.count({
    where: {
      role: "admin",
      disabledAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
}

export function latest(...values: (Date | null | undefined)[]) {
  let max: Date | null = null;
  for (const value of values) {
    if (!value) continue;
    if (!max || value > max) max = value;
  }
  return max;
}
