import "../lib/loadEnv.js";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { extname, join } from "node:path";
import { prisma } from "../lib/prisma.js";
import { buildPostPayload, toCommentExcerpt } from "../lib/postPayload.js";
import {
  contentTypeForExt,
  getObjectBuffer,
  headObject,
  putObject,
  putPostPayload,
  shotObjectKey,
} from "../lib/s3.js";
import { UPLOAD_DIR } from "../lib/upload.js";

type LegacyPost = {
  id: string;
  comment: string | null;
  bait: string;
  weightKg: number | null;
  commentExcerpt: string;
  updatedAt: Date;
};

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function argValue(name: string) {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

async function legacyPosts(): Promise<LegacyPost[]> {
  try {
    return await prisma.$queryRaw<LegacyPost[]>`
      SELECT id, comment, bait, "weightKg" AS "weightKg", "commentExcerpt", "updatedAt"
      FROM "Post"
    `;
  } catch {
    return prisma.post.findMany({
      select: { id: true, bait: true, commentExcerpt: true, updatedAt: true },
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        comment: r.commentExcerpt,
        bait: r.bait,
        weightKg: null,
        commentExcerpt: r.commentExcerpt,
        updatedAt: r.updatedAt,
      })),
    );
  }
}

async function main() {
  const dry = hasFlag("--dry");
  const verify = hasFlag("--verify");
  const cleanupLocal = hasFlag("--cleanup-local");
  const finalize = hasFlag("--finalize");
  const dir = argValue("--dir") || UPLOAD_DIR;

  console.log(`S3 migrate (dry=${dry}, verify=${verify}, cleanup=${cleanupLocal}, finalize=${finalize})`);
  console.log(`Локальная папка: ${dir}`);
  console.log(
    `S3: endpoint=${process.env.S3_ENDPOINT || "https://s3.ru1.storage.beget.cloud"} bucket=${process.env.S3_BUCKET || "?"} pathStyle=${process.env.S3_FORCE_PATH_STYLE ?? "true"}`,
  );

  const localCount = existsSync(dir)
    ? readdirSync(dir).filter((n) => !n.startsWith(".") && statSync(join(dir, n)).isFile()).length
    : 0;
  console.log(`Файлов в локальной папке: ${localCount}`);

  console.log("Читаю Screenshot из БД…");
  const shots = await prisma.screenshot.findMany({
    select: { id: true, objectKey: true, postId: true, commentId: true, sortOrder: true },
  });
  console.log(`Записей Screenshot: ${shots.length}`);

  let uploaded = 0;
  let skipped = 0;
  const missingLocal: string[] = [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]!;
    const localName = shot.objectKey.replace(/^shots\//, "");
    const localPath = join(dir, localName);
    if ((i + 1) % 25 === 0 || i === 0) {
      console.log(`shots ${i + 1}/${shots.length}…`);
    }
    if (!existsSync(localPath)) {
      if (verify) {
        try {
          await headObject(shot.objectKey);
          skipped += 1;
          continue;
        } catch {
          missingLocal.push(shot.objectKey);
          continue;
        }
      }
      missingLocal.push(shot.objectKey);
      continue;
    }
    if (dry) {
      console.log(`would upload ${localPath} -> ${shot.objectKey}`);
      uploaded += 1;
      continue;
    }
    const ext = extname(localName).toLowerCase() || ".jpg";
    const body = readFileSync(localPath);
    console.log(`upload ${shot.objectKey} (${body.length} B)`);
    await putObject(shot.objectKey, body, contentTypeForExt(ext));
    uploaded += 1;
  }

  console.log(`Скриншоты: загружено/запланировано ${uploaded}, уже в S3 ${skipped}, нет локально ${missingLocal.length}`);
  if (missingLocal.length && missingLocal.length <= 20) {
    for (const k of missingLocal) console.log(`  missing ${k}`);
  }

  const posts = await legacyPosts();
  const shotsByPost = new Map<string, typeof shots>();
  for (const s of shots) {
    if (!s.postId) continue;
    const list = shotsByPost.get(s.postId) ?? [];
    list.push(s);
    shotsByPost.set(s.postId, list);
  }

  let payloads = 0;
  for (const post of posts) {
    const comment = post.comment ?? post.commentExcerpt ?? "";
    const payload = buildPostPayload({
      id: post.id,
      comment,
      bait: post.bait,
      weightKg: post.weightKg,
      screenshots: (shotsByPost.get(post.id) ?? []).map((s) => ({
        id: s.id,
        objectKey: s.objectKey,
        sortOrder: s.sortOrder,
      })),
      updatedAt: post.updatedAt,
    });
    if (dry) {
      console.log(`would put posts/${post.id}.json (${payload.screenshots.length} shots)`);
      payloads += 1;
      continue;
    }
    await putPostPayload(payload);
    const excerpt = toCommentExcerpt(comment);
    if (excerpt !== post.commentExcerpt) {
      await prisma.post.update({ where: { id: post.id }, data: { commentExcerpt: excerpt } });
    }
    payloads += 1;
  }
  console.log(`Payload постов: ${payloads}`);

  if (verify && !dry) {
    let ok = 0;
    let fail = 0;
    for (const shot of shots.slice(0, Math.min(shots.length, 50))) {
      try {
        await headObject(shot.objectKey);
        ok += 1;
      } catch {
        fail += 1;
        console.error(`verify fail ${shot.objectKey}`);
      }
    }
    for (const post of posts.slice(0, Math.min(posts.length, 20))) {
      try {
        const buf = await getObjectBuffer(`posts/${post.id}.json`);
        JSON.parse(buf.toString("utf8"));
        ok += 1;
      } catch {
        fail += 1;
        console.error(`verify fail posts/${post.id}.json`);
      }
    }
    console.log(`Verify sample: ok=${ok} fail=${fail}`);
    if (fail) process.exitCode = 1;
  }

  if (cleanupLocal && !dry) {
    if (!existsSync(dir)) {
      console.log("Локальная папка уже пуста");
    } else {
      const names = readdirSync(dir).filter((n) => !n.startsWith("."));
      let removed = 0;
      for (const name of names) {
        const path = join(dir, name);
        if (!statSync(path).isFile()) continue;
        const key = shotObjectKey(name);
        try {
          await headObject(key);
          unlinkSync(path);
          removed += 1;
        } catch {
          console.warn(`оставляю ${path} — нет в S3`);
        }
      }
      console.log(`Удалено локальных файлов: ${removed}`);
    }
  }

  if (finalize && !dry) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" DROP COLUMN IF EXISTS "comment"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" DROP COLUMN IF EXISTS "weightKg"`);
    console.log("Колонки Post.comment и Post.weightKg удалены");
  } else if (!finalize) {
    console.log("После проверки запустите с --finalize чтобы удалить Post.comment / weightKg");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
