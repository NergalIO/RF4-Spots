import "../lib/loadEnv.js";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";

function arg(name: string): string | undefined {
  const i = process.argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return undefined;
  const cur = process.argv[i];
  if (cur.includes("=")) return cur.split("=").slice(1).join("=");
  return process.argv[i + 1];
}

async function main() {
  const nickname = (arg("nickname") ?? process.argv[2])?.trim();
  const password = arg("password") ?? process.argv[3];
  const roleArg = (arg("role") ?? "admin").trim().toLowerCase();
  const role = roleArg === "player" ? "player" : "admin";
  if (!nickname || !password) {
    console.error("Использование: npm run create-admin -- --nickname NAME --password SECRET");
    console.error("Игрок: npm run create-user -- --nickname NAME --password SECRET");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Пароль от 8 символов.");
    process.exit(1);
  }
  const existing = await prisma.user.findUnique({ where: { nickname } });
  if (existing) {
    if (role === "admin" && existing.role !== "admin") {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin", disabledAt: null },
      });
      console.log(`Пользователь ${updated.nickname} повышен до админа (id ${updated.id}).`);
      return;
    }
    console.log(`Пользователь ${existing.nickname} уже есть (роль ${existing.role}, id ${existing.id}).`);
    return;
  }
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { nickname, passwordHash, role },
  });
  console.log(`Создан ${user.role} ${user.nickname} (id ${user.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
