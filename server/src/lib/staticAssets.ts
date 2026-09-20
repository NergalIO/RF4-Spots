import { extname, join, sep } from "node:path";
import { existsSync } from "node:fs";
import express from "express";
import { clientDownloads, sendLatestApk, sendLatestInstaller } from "./static/clientDownloads.js";
import { sendDownloadPage } from "./static/downloadPage.js";
import { hasWebApp, mapsDir, updatesDir, webDir, webIndexPath } from "./static/paths.js";

const UPDATE_EXTS = new Set([".exe", ".yml", ".yaml", ".blockmap", ".zip", ".apk"]);

export function mountStaticAssets(app: express.Express, uploadDir: string) {
  const dir = updatesDir();
  const maps = mapsDir();
  app.get("/updates/latest", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(clientDownloads());
  });
  app.get("/updates/installer", sendLatestInstaller);
  app.get("/updates/installer.exe", sendLatestInstaller);
  app.get("/updates/apk", sendLatestApk);
  app.get("/updates/apk.apk", sendLatestApk);
  app.get("/updates/changes", (_req, res) => {
    const file = join(dir, "changes");
    if (!existsSync(file)) {
      res.status(404).type("text/plain").send("История обновлений пока недоступна");
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.sendFile(file);
  });
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
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
  app.use(
    "/uploads",
    express.static(uploadDir, {
      index: false,
      dotfiles: "deny",
      etag: true,
      lastModified: true,
      maxAge: 31536000000,
      immutable: true,
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
}

export function mountWebApp(app: express.Express) {
  app.get("/", (req, res) => {
    if (hasWebApp()) {
      res.setHeader("Cache-Control", "no-store");
      res.sendFile(webIndexPath());
      return;
    }
    sendDownloadPage(req, res);
  });
  if (!hasWebApp()) {
    app.get("/index.html", sendDownloadPage);
    return;
  }
  app.use(
    express.static(webDir(), {
      index: false,
      dotfiles: "deny",
      fallthrough: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith(`${sep}index.html`)) {
          res.setHeader("Cache-Control", "no-store");
        }
        if (filePath.includes(`${sep}assets${sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
}
