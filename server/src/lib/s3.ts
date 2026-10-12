import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { envFlag } from "./env.js";

export type PostPayloadShot = { id: string; key: string; sortOrder: number };

export type PostPayload = {
  v: 1;
  id: string;
  comment: string;
  bait: string;
  weightKg: number | null;
  screenshots: PostPayloadShot[];
  updatedAt: string;
};

let client: S3Client | null = null;

function required(name: string) {
  const value = (process.env[name] ?? "").trim();
  if (!value) throw new Error(`Не задан ${name}`);
  return value;
}

export function s3Bucket() {
  return required("S3_BUCKET");
}

export function s3SignedTtlSec() {
  const n = Number(process.env.S3_SIGNED_URL_TTL || 3600);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3600;
}

export function getS3() {
  if (client) return client;
  const endpoint = (process.env.S3_ENDPOINT || "https://s3.ru1.storage.beget.cloud").trim();
  const region = (process.env.S3_REGION || "ru1").trim();
  client = new S3Client({
    region,
    endpoint,
    forcePathStyle: envFlag("S3_FORCE_PATH_STYLE", true),
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY"),
      secretAccessKey: required("S3_SECRET_KEY"),
    },
  });
  return client;
}

/** Test helper */
export function resetS3Client() {
  client = null;
}

export function postPayloadKey(postId: string) {
  return `posts/${postId}.json`;
}

export function shotObjectKey(filename: string) {
  const name = filename.replace(/^shots\//, "");
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error("Некорректный ключ скриншота");
  }
  return `shots/${name}`;
}

export async function putObject(key: string, body: Buffer | string, contentType: string) {
  await getS3().send(
    new PutObjectCommand({
      Bucket: s3Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const out = await getS3().send(new GetObjectCommand({ Bucket: s3Bucket(), Key: key }));
  if (!out.Body) throw new Error(`Пустой объект ${key}`);
  return Buffer.from(await out.Body.transformToByteArray());
}

export async function headObject(key: string) {
  await getS3().send(new HeadObjectCommand({ Bucket: s3Bucket(), Key: key }));
}

export async function deleteObjects(keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return;
  const chunk = 1000;
  for (let i = 0; i < unique.length; i += chunk) {
    const Keys = unique.slice(i, i + chunk).map((Key) => ({ Key }));
    await getS3().send(
      new DeleteObjectsCommand({
        Bucket: s3Bucket(),
        Delete: { Objects: Keys, Quiet: true },
      }),
    );
  }
}

export async function presignGet(key: string, ttlSec = s3SignedTtlSec()) {
  return getSignedUrl(getS3(), new GetObjectCommand({ Bucket: s3Bucket(), Key: key }), {
    expiresIn: ttlSec,
  });
}

export async function putPostPayload(payload: PostPayload) {
  await putObject(postPayloadKey(payload.id), JSON.stringify(payload), "application/json");
}

export async function getPostPayload(postId: string): Promise<PostPayload> {
  const buf = await getObjectBuffer(postPayloadKey(postId));
  return JSON.parse(buf.toString("utf8")) as PostPayload;
}

export async function deletePostPayload(postId: string) {
  await deleteObjects([postPayloadKey(postId)]);
}

export async function listAllKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const out = await getS3().send(
      new ListObjectsV2Command({
        Bucket: s3Bucket(),
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const obj of out.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export function contentTypeForExt(ext: string) {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}
