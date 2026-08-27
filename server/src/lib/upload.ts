import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { extname, join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { prisma } from "./prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_USER_SHOTS = 500;
const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

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

export function unlinkFilenames(filenames: string[]) {
  for (const name of filenames) {
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) continue;
    try {
      unlinkSync(join(UPLOAD_DIR, name));
    } catch {
      /* already gone */
    }
  }
}

export function removeUploaded(files: Express.Multer.File[]) {
  for (const file of files) {
    try {
      unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }
}

export function isMulterError(err: unknown): err is multer.MulterError {
  return err instanceof multer.MulterError;
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${allowed.has(ext) ? ext : ".jpg"}`);
    },
  }),
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
    let kind: ReturnType<typeof sniffImage> = null;
    try {
      kind = sniffImage(readFileSync(file.path).subarray(0, 16));
    } catch {
      kind = null;
    }
    const ext = extname(file.filename).toLowerCase();
    if (!kind || !extMatchesKind(ext, kind)) {
      removeUploaded(files);
      res.status(400).json({ error: "Можно только изображения JPEG, PNG, WebP или GIF" });
      return;
    }
  }
  next();
}

export async function enforceUploadQuota(req: AuthedRequest, res: Response, next: NextFunction) {
  const files = uploadedFiles(req);
  const userId = req.user?.id;
  if (!files.length || !userId) {
    next();
    return;
  }
  try {
    const count = await prisma.screenshot.count({
      where: {
        OR: [{ post: { userId } }, { comment: { userId } }],
      },
    });
    if (count + files.length > MAX_USER_SHOTS) {
      removeUploaded(files);
      res.status(429).json({ error: "Слишком много загрузок для этого аккаунта" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
