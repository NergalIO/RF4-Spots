import "./lib/loadEnv.js";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { jwtSecret } from "./lib/auth.js";
import { envFlag } from "./lib/env.js";
import {
  allowInsecureLocal,
  corsOriginDelegate,
  isSecureRequest,
  requireHttps,
} from "./lib/security.js";
import { isMulterError, UPLOAD_DIR } from "./lib/upload.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { postsRouter } from "./routes/posts.js";
import { commentsRouter } from "./routes/comments.js";
import { guidesRouter } from "./routes/guides.js";

jwtSecret();

const here = dirname(fileURLToPath(import.meta.url));
const mapsDir = existsSync(join(process.cwd(), "assets", "maps"))
  ? join(process.cwd(), "assets", "maps")
  : join(here, "..", "assets", "maps");
const updatesDir = existsSync(join(process.cwd(), "updates"))
  ? join(process.cwd(), "updates")
  : join(here, "..", "updates");
if (!existsSync(updatesDir)) mkdirSync(updatesDir, { recursive: true });
try {
  chmodSync(updatesDir, 0o755);
} catch {
  /* windows / volume perms */
}

const UPDATE_EXTS = new Set([".exe", ".yml", ".yaml", ".blockmap", ".zip"]);

const app = express();
const port = Number(process.env.PORT || 3780);
const host = process.env.HOST || "0.0.0.0";

if (envFlag("TRUST_PROXY", false)) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors({ origin: corsOriginDelegate }));
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  if (!requireHttps()) {
    next();
    return;
  }
  if (isSecureRequest(req) || allowInsecureLocal(req)) {
    next();
    return;
  }
  res.status(403).json({ error: "Нужен HTTPS" });
});

app.use("/uploads", express.static(UPLOAD_DIR, { index: false, dotfiles: "deny" }));

function latestInstaller() {
  let name = "";
  const ymlPath = join(updatesDir, "latest.yml");
  if (existsSync(ymlPath)) {
    const text = readFileSync(ymlPath, "utf8");
    name = basename(
      (text.match(/^path:\s*(\S+)/m)?.[1] || text.match(/^\s+-\s+url:\s*(\S+)/m)?.[1] || "").trim(),
    );
  }
  const filePath = name ? join(updatesDir, name) : "";
  if (!name || name.includes("..") || !name.toLowerCase().endsWith(".exe") || !existsSync(filePath)) {
    const found = readdirSync(updatesDir)
      .filter((item) => /^RF4Spots-Setup-.+\.exe$/i.test(item))
      .map((item) => ({ item, mtime: statSync(join(updatesDir, item)).mtimeMs }))
      .sort((a, b) => a.mtime - b.mtime)
      .at(-1);
    if (!found) return null;
    name = found.item;
  }
  return { name, filePath: join(updatesDir, name) };
}

function sendLatestInstaller(_req: express.Request, res: express.Response) {
  const installer = latestInstaller();
  if (!installer) {
    res.status(404).json({ error: "Установщик ещё не собран" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.download(installer.filePath, installer.name);
}

app.get("/updates/installer", sendLatestInstaller);
app.get("/updates/installer.exe", sendLatestInstaller);

app.use("/updates", (req, res, next) => {
  const ext = extname(req.path).toLowerCase();
  if (!UPDATE_EXTS.has(ext)) {
    res.status(404).end();
    return;
  }
  next();
});
app.use(
  "/updates",
  express.static(updatesDir, {
    index: false,
    dotfiles: "deny",
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "text/yaml; charset=utf-8");
      }
    },
  }),
);
app.use(
  "/maps",
  express.static(mapsDir, {
    index: false,
    dotfiles: "deny",
    etag: true,
    lastModified: true,
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-store");
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/guides", guidesRouter);
app.use(catalogRouter);
app.use("/posts", postsRouter);
app.use(commentsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (isMulterError(err)) {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    res.status(400).json({ error: tooBig ? "Файл слишком большой" : "Ошибка загрузки" });
    return;
  }
  if (err instanceof Error && err.message.startsWith("Можно только изображения")) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Ошибка сервера" });
});

app.listen(port, host, () => {
  console.log(`RF4 Spots API http://${host}:${port}`);
});
