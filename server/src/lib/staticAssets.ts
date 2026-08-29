import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, chmodSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const here = dirname(fileURLToPath(import.meta.url));
const UPDATE_EXTS = new Set([".exe", ".yml", ".yaml", ".blockmap", ".zip"]);

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

function latestInstaller() {
  const dir = updatesDir();
  let name = "";
  const ymlPath = join(dir, "latest.yml");
  if (existsSync(ymlPath)) {
    const text = readFileSync(ymlPath, "utf8");
    name = basename(
      (text.match(/^path:\s*(\S+)/m)?.[1] || text.match(/^\s+-\s+url:\s*(\S+)/m)?.[1] || "").trim(),
    );
  }
  const filePath = name ? join(dir, name) : "";
  if (!name || name.includes("..") || !name.toLowerCase().endsWith(".exe") || !existsSync(filePath)) {
    const found = readdirSync(dir)
      .filter((item) => /^RF4Spots-Setup-.+\.exe$/i.test(item))
      .map((item) => ({ item, mtime: statSync(join(dir, item)).mtimeMs }))
      .sort((a, b) => a.mtime - b.mtime)
      .at(-1);
    if (!found) return null;
    name = found.item;
  }
  return { name, filePath: join(dir, name) };
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

export function mountStaticAssets(app: express.Express, uploadDir: string) {
  const dir = updatesDir();
  const maps = mapsDir();
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
