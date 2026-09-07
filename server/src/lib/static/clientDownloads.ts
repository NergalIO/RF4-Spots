import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type express from "express";
import { APK_NAME_RE, INSTALLER_NAME_RE, installerNameFromYml, pickNewestName } from "../updateArtifacts.js";
import { updatesDir } from "./paths.js";

function stampedNames(dir: string, test: (name: string) => boolean) {
  return readdirSync(dir)
    .filter(test)
    .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }));
}

export function latestInstaller() {
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

export function latestApk() {
  const dir = updatesDir();
  const name = pickNewestName(stampedNames(dir, (item) => APK_NAME_RE.test(item)));
  if (!name) return null;
  return { name, filePath: join(dir, name) };
}

export function sendFileDownload(res: express.Response, file: { name: string; filePath: string } | null, missing: string) {
  if (!file) {
    res.status(404).json({ error: missing });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.download(file.filePath, file.name);
}

export function clientDownloads() {
  const installer = latestInstaller();
  const apk = latestApk();
  return {
    installer: installer ? { name: installer.name, url: "/updates/installer" } : null,
    apk: apk ? { name: apk.name, url: "/updates/apk" } : null,
  };
}

export function sendLatestInstaller(_req: express.Request, res: express.Response) {
  sendFileDownload(res, latestInstaller(), "Установщик ещё не собран");
}

export function sendLatestApk(_req: express.Request, res: express.Response) {
  sendFileDownload(res, latestApk(), "APK ещё не собран");
}
