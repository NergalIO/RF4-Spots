import "./lib/loadEnv.js";
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
import { prisma } from "./lib/prisma.js";
import { isMulterError, UPLOAD_DIR } from "./lib/upload.js";
import { mountStaticAssets } from "./lib/staticAssets.js";
import { adminRouter } from "./routes/admin/index.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { commentsRouter } from "./routes/comments.js";
import { guidesRouter } from "./routes/guides.js";
import { postsRouter } from "./routes/posts.js";
import { reportsRouter } from "./routes/reports.js";

jwtSecret();

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

mountStaticAssets(app, UPLOAD_DIR);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/guides", guidesRouter);
app.use(catalogRouter);
app.use("/posts", postsRouter);
app.use(commentsRouter);
app.use(reportsRouter);

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
