import "./lib/loadEnv.js";
import express from "express";
import cors from "cors";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { postsRouter } from "./routes/posts.js";
import { commentsRouter } from "./routes/comments.js";
import { UPLOAD_DIR } from "./lib/upload.js";

const here = dirname(fileURLToPath(import.meta.url));
const mapsDir = existsSync(join(process.cwd(), "assets", "maps"))
  ? join(process.cwd(), "assets", "maps")
  : join(here, "..", "assets", "maps");

const app = express();
const port = Number(process.env.PORT || 3780);
const host = process.env.HOST || "0.0.0.0";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
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
  res.json({
    ok: true,
    mapsDir,
    elkBytes: existsSync(elk) ? statSync(elk).size : 0,
  });
});

app.use("/auth", authRouter);
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
