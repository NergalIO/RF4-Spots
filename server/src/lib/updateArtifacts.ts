import { basename } from "node:path";

export const INSTALLER_NAME_RE = /^RF4Spots-Setup-.+\.exe$/i;
export const APK_NAME_RE = /^RF4Spots-\d+\.\d+\.\d+\.apk$/i;

export type NamedStamp = { name: string; mtime: number };

export function installerNameFromYml(text: string) {
  const raw = (text.match(/^path:\s*(\S+)/m)?.[1] || text.match(/^\s+-\s+url:\s*(\S+)/m)?.[1] || "").trim();
  return basename(raw.replace(/\\/g, "/"));
}

export function pickNewestName(items: NamedStamp[]) {
  if (!items.length) return "";
  return items.slice().sort((a, b) => a.mtime - b.mtime).at(-1)?.name || "";
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
