import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import multer from "multer";

export const UPLOAD_DIR = join(process.cwd(), "uploads");

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${randomUUID()}${allowed.has(ext) ? ext : ".jpg"}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const ok = allowed.has(ext) || file.mimetype.startsWith("image/");
    if (!ok) cb(new Error("Можно только изображения"));
    else cb(null, true);
  },
});
