import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, chmodSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  APK_NAME_RE,
  INSTALLER_NAME_RE,
  escapeHtml,
  installerNameFromYml,
  pickNewestName,
} from "./updateArtifacts.js";

const here = dirname(fileURLToPath(import.meta.url));
const UPDATE_EXTS = new Set([".exe", ".yml", ".yaml", ".blockmap", ".zip", ".apk"]);

export function updatesDir(): string {
  const cwd = existsSync(join(process.cwd(), "updates"))
    ? join(process.cwd(), "updates")
    : join(here, "..", "..", "updates");
  if (!existsSync(cwd)) mkdirSync(cwd, { recursive: true });
  try {
    chmodSync(cwd, 0o755);
  } catch {
    /* windows / volume perms */
  }
  return cwd;
}

export function mapsDir(): string {
  return existsSync(join(process.cwd(), "assets", "maps"))
    ? join(process.cwd(), "assets", "maps")
    : join(here, "..", "..", "assets", "maps");
}

function stampedNames(dir: string, test: (name: string) => boolean) {
  return readdirSync(dir)
    .filter(test)
    .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }));
}

function latestInstaller() {
  const dir = updatesDir();
  let name = "";
  const ymlPath = join(dir, "latest.yml");
  if (existsSync(ymlPath)) {
    name = installerNameFromYml(readFileSync(ymlPath, "utf8"));
  }
  const filePath = name ? join(dir, name) : "";
  if (!name || name.includes("..") || !name.toLowerCase().endsWith(".exe") || !existsSync(filePath)) {
    name = pickNewestName(stampedNames(dir, (item) => INSTALLER_NAME_RE.test(item)));
    if (!name) return null;
  }
  return { name, filePath: join(dir, name) };
}

function latestApk() {
  const dir = updatesDir();
  const name = pickNewestName(stampedNames(dir, (item) => APK_NAME_RE.test(item)));
  if (!name) return null;
  return { name, filePath: join(dir, name) };
}

function sendFileDownload(res: express.Response, file: { name: string; filePath: string } | null, missing: string) {
  if (!file) {
    res.status(404).json({ error: missing });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.download(file.filePath, file.name);
}

function sendLatestInstaller(_req: express.Request, res: express.Response) {
  sendFileDownload(res, latestInstaller(), "Установщик ещё не собран");
}

function sendLatestApk(_req: express.Request, res: express.Response) {
  sendFileDownload(res, latestApk(), "APK ещё не собран");
}

function clientDownloads() {
  const installer = latestInstaller();
  const apk = latestApk();
  return {
    installer: installer ? { name: installer.name, url: "/updates/installer" } : null,
    apk: apk ? { name: apk.name, url: "/updates/apk" } : null,
  };
}

function sendDownloadPage(_req: express.Request, res: express.Response) {
  const { installer, apk } = clientDownloads();
  const links = [
    installer
      ? `<a class="btn" href="${installer.url}">Windows · ${escapeHtml(installer.name)}</a>`
      : "",
    apk ? `<a class="btn" href="${apk.url}">Android · ${escapeHtml(apk.name)}</a>` : "",
  ]
    .filter(Boolean)
    .join("");
  const body = links || "<p class=\"muted\">Сборки клиента ещё не выложены.</p>";
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>RF4 Spots</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: "Segoe UI", sans-serif; color: #e7efe8;
      background: radial-gradient(1200px 700px at 10% -10%, #143246, #07131c);
    }
    .card {
      width: min(440px, calc(100% - 32px)); padding: 32px 28px;
      background: linear-gradient(180deg, #132a36, #0d1d27);
      border: 1px solid rgba(212, 180, 106, 0.22); border-radius: 18px;
    }
    .eyebrow { letter-spacing: 0.16em; text-transform: uppercase; color: #c9a35a; font-size: 11px; margin: 0 0 8px; }
    h1 { margin: 0 0 8px; font-size: 28px; font-weight: 600; }
    .lead { margin: 0 0 22px; color: #8aa0a8; line-height: 1.45; }
    .links { display: grid; gap: 10px; }
    .btn {
      display: block; text-align: center; text-decoration: none;
      padding: 12px 14px; border-radius: 10px; font-weight: 700;
      background: linear-gradient(180deg, #dcc58a, #b8903e); color: #1a1408;
    }
    .muted { margin: 0; color: #8aa0a8; }
  </style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">Russian Fishing 4</p>
    <h1>Точки ловли</h1>
    <p class="lead">Скачайте клиент для Windows или Android.</p>
    <div class="links">${body}</div>
  </div>
</body>
</html>`);
}

export function mountStaticAssets(app: express.Express, uploadDir: string) {
  const dir = updatesDir();
  const maps = mapsDir();
  app.get("/", sendDownloadPage);
  app.get("/updates/latest", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(clientDownloads());
  });
  app.get("/updates/installer", sendLatestInstaller);
  app.get("/updates/installer.exe", sendLatestInstaller);
  app.get("/updates/apk", sendLatestApk);
  app.get("/updates/apk.apk", sendLatestApk);
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
    express.static(dir, {
      index: false,
      dotfiles: "deny",
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", "text/yaml; charset=utf-8");
        }
        if (filePath.endsWith(".apk")) {
          res.setHeader("Content-Type", "application/vnd.android.package-archive");
        }
      },
    }),
  );
  app.use(
    "/maps",
    express.static(maps, {
      index: false,
      dotfiles: "deny",
      etag: true,
      lastModified: true,
      setHeaders(res) {
        res.setHeader("Cache-Control", "no-store");
      },
    }),
  );
  app.use("/uploads", express.static(uploadDir, { index: false, dotfiles: "deny" }));
}
