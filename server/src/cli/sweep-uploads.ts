import "../lib/loadEnv.js";
import { prisma } from "../lib/prisma.js";
import { deleteObjects, listAllKeys, postPayloadKey } from "../lib/s3.js";

async function main() {
  const dry = process.argv.includes("--dry");
  const shotKeys = await listAllKeys("shots/");
  const postKeys = await listAllKeys("posts/");
  const rows = await prisma.screenshot.findMany({ select: { objectKey: true } });
  const keepShots = new Set(rows.map((r) => r.objectKey));
  const posts = await prisma.post.findMany({ select: { id: true } });
  const keepPosts = new Set(posts.map((p) => postPayloadKey(p.id)));

  const orphanShots = shotKeys.filter((k) => !keepShots.has(k));
  const orphanPosts = postKeys.filter((k) => !keepPosts.has(k));
  const orphan = [...orphanShots, ...orphanPosts];

  if (!orphan.length) {
    console.log(`Лишних объектов нет (shots=${shotKeys.length}, posts=${postKeys.length}).`);
    return;
  }

  if (dry) {
    console.log(`К удалению (${orphan.length}):`);
    for (const key of orphan) console.log(key);
    return;
  }

  await deleteObjects(orphan);
  console.log(`Удалено объектов без записи в БД: ${orphan.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
