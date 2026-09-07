import { extname } from "node:path";
import express from "express";
import { clientDownloads, sendLatestApk, sendLatestInstaller } from "./static/clientDownloads.js";
import { sendDownloadPage } from "./static/downloadPage.js";
import { mapsDir, updatesDir } from "./static/paths.js";

const UPDATE_EXTS = new Set([".exe", ".yml", ".yaml", ".blockmap", ".zip", ".apk"]);

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
