import "../lib/loadEnv.js";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/prisma.js";
import { UPLOAD_DIR, unlinkFilenames } from "../lib/upload.js";

async function main() {
  if (!existsSync(UPLOAD_DIR)) {
    console.log("Папка uploads пуста.");
    return;
  }
  const onDisk = readdirSync(UPLOAD_DIR).filter((name) => !name.startsWith("."));
  const rows = await prisma.screenshot.findMany({ select: { filename: true } });
  const keep = new Set(rows.map((r) => r.filename));
  const orphan = onDisk.filter((name) => !keep.has(name));
  if (!orphan.length) {
    console.log(`Лишних файлов нет (${onDisk.length} на диске).`);
    return;
  }
  const dry = process.argv.includes("--dry");
  if (dry) {
    console.log(`К удалению (${orphan.length}):`);
    for (const name of orphan) console.log(join(UPLOAD_DIR, name));
    return;
  }
  unlinkFilenames(orphan);
  console.log(`Удалено файлов без записи в БД: ${orphan.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
