import "./lib/loadEnv.js";
import express from "express";
import cors from "cors";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { postsRouter } from "./routes/posts.js";
import { commentsRouter } from "./routes/comments.js";
import { guidesRouter } from "./routes/guides.js";
import { UPLOAD_DIR } from "./lib/upload.js";

const here = dirname(fileURLToPath(import.meta.url));
const mapsDir = existsSync(join(process.cwd(), "assets", "maps"))
  ? join(process.cwd(), "assets", "maps")
  : join(here, "..", "assets", "maps");
const updatesDir = existsSync(join(process.cwd(), "updates"))
  ? join(process.cwd(), "updates")
  : join(here, "..", "updates");
if (!existsSync(updatesDir)) mkdirSync(updatesDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 3780);
const host = process.env.HOST || "0.0.0.0";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(
  "/updates",
  express.static(updatesDir, {
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
    etag: true,
    lastModified: true,
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-store");
    },
  }),
);

app.get("/health", (_req, res) => {
  const elk = join(mapsDir, "elk.png");
  const latest = join(updatesDir, "latest.yml");
  res.json({
    ok: true,
    mapsDir,
    elkBytes: existsSync(elk) ? statSync(elk).size : 0,
    updates: existsSync(latest),
  });
});

app.use("/auth", authRouter);
app.use("/guides", guidesRouter);
app.use(catalogRouter);
app.use("/posts", postsRouter);
app.use(commentsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Ошибка сервера";
  console.error(err);
  res.status(500).json({ error: message });
});

app.listen(port, host, () => {
  console.log(`RF4 Spots API http://${host}:${port}`);
});
