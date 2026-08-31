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

function usage() {
  console.error("Использование: npm run set-password -- --nickname NAME --password SECRET");
  console.error("В Docker: docker compose exec api npm run set-password -- --nickname NAME");
  console.error("Без --password пароль спрашивается с клавиатуры или читается со stdin.");
}

// Ввод без эха: пароль не остаётся ни в истории оболочки, ни в списке процессов.
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const finish = (err?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      if (err) reject(err);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") return finish();
        if (ch === "\u0003") return finish(new Error("Отменено"));
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function askPassword() {
  if (!process.stdin.isTTY) return readStdin();
  const first = await askHidden("Новый пароль: ");
  const again = await askHidden("Повторите: ");
  if (first !== again) {
    console.error("Пароли не совпадают.");
    process.exit(1);
  }
  return first;
}

async function main() {
  const nickname = (arg("nickname") ?? process.argv[2])?.trim();
  if (!nickname || nickname.startsWith("--")) {
    usage();
    process.exit(1);
  }
  const password = arg("password") ?? process.argv[3] ?? (await askPassword());
  if (!password) {
    usage();
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Пароль от 8 символов.");
    process.exit(1);
  }
  if (password.length > 72) {
    console.error("Пароль до 72 символов.");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user) {
    console.error(`Пользователь ${nickname} не найден.`);
    const near = await prisma.user.findMany({
      where: { nickname: { contains: nickname, mode: "insensitive" } },
      select: { nickname: true },
      orderBy: { nickname: "asc" },
      take: 5,
    });
    if (near.length) console.error(`Похожие ники: ${near.map((u) => u.nickname).join(", ")}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const passwordHash = await argon2.hash(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  console.log(`Пароль ${user.nickname} изменён (id ${user.id}). Прежние сессии сброшены — нужен повторный вход.`);
  if (user.disabledAt) {
    console.log("Аккаунт отключён: войти не получится, пока его не включат во вкладке «Админ».");
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
