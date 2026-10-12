import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { extname, join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { prisma } from "./prisma.js";
import { uploadLimiter } from "./rateLimit.js";
import { contentTypeForExt, deleteObjects, putObject, shotObjectKey } from "./s3.js";
import type { AuthedRequest } from "../middleware/auth.js";

/** Local dir used only by storage:migrate / legacy cleanup */
export const UPLOAD_DIR = join(process.cwd(), "uploads");

const MAX_USER_SHOTS = 500;
const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export type UploadedShot = { objectKey: string };

export function sniffImage(buf: Buffer): "jpeg" | "png" | "gif" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length >= 6) {
    const gif = buf.subarray(0, 6).toString("ascii");
    if (gif === "GIF87a" || gif === "GIF89a") return "gif";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function extMatchesKind(ext: string, kind: ReturnType<typeof sniffImage>) {
  if (kind === "jpeg") return ext === ".jpg" || ext === ".jpeg";
  if (kind === "png") return ext === ".png";
  if (kind === "gif") return ext === ".gif";
  if (kind === "webp") return ext === ".webp";
  return false;
}

export function uploadedFiles(req: Request): Express.Multer.File[] {
  return (req.files as Express.Multer.File[] | undefined) ?? [];
}

/** Local unlink for migrate --cleanup-local */
export function unlinkFilenames(filenames: string[]) {
  for (const name of filenames) {
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) continue;
    try {
      const path = join(UPLOAD_DIR, name);
      if (existsSync(path)) unlinkSync(path);
    } catch {
      /* already gone */
    }
  }
}

export function removeUploaded(_files: Express.Multer.File[]) {
  /* memory storage — nothing on disk */
}

export async function discardUploadedShots(shots: UploadedShot[]) {
  await deleteObjects(shots.map((s) => s.objectKey));
}

export async function persistUploadedShots(files: Express.Multer.File[]): Promise<UploadedShot[]> {
  const shots: UploadedShot[] = [];
  try {
    for (const file of files) {
      const ext = extname(file.originalname).toLowerCase();
      const safeExt = allowed.has(ext) ? (ext === ".jpeg" ? ".jpg" : ext) : ".jpg";
      const objectKey = shotObjectKey(`${randomUUID()}${safeExt}`);
      await putObject(objectKey, file.buffer, contentTypeForExt(safeExt));
      shots.push({ objectKey });
    }
    return shots;
  } catch (err) {
    await discardUploadedShots(shots);
    throw err;
  }
}

export function isMulterError(err: unknown): err is multer.MulterError {
  return err instanceof multer.MulterError;
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!allowed.has(ext)) cb(new Error("Можно только изображения JPEG, PNG, WebP или GIF"));
    else cb(null, true);
  },
});

export function validateUploads(req: Request, res: Response, next: NextFunction) {
  const files = uploadedFiles(req);
  for (const file of files) {
    const buf = file.buffer?.subarray(0, 16) ?? Buffer.alloc(0);
    const kind = sniffImage(buf);
    const ext = extname(file.originalname).toLowerCase();
    if (!kind || !extMatchesKind(ext, kind)) {
      res.status(400).json({ error: "Можно только изображения JPEG, PNG, WebP или GIF" });
      return;
    }
  }
  next();
}

export async function enforceUploadQuota(req: AuthedRequest, res: Response, next: NextFunction) {
  const files = uploadedFiles(req);
  const userId = req.user?.id;
  if (!files.length || !userId || req.user?.role === "admin") {
    next();
    return;
  }
  try {
    const count = await prisma.screenshot.count({
      where: { ownerUserId: userId },
    });
    if (count + files.length > MAX_USER_SHOTS) {
      res.status(429).json({ error: "Слишком много загрузок для этого аккаунта" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export const uploadScreenshots = [
  uploadLimiter,
  upload.array("screenshots", 8),
  validateUploads,
  enforceUploadQuota,
];
