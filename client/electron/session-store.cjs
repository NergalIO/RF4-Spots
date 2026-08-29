const { app, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");

const DEFAULT_SERVER_URL = "http://127.0.0.1:3780";
const isDev = !app.isPackaged;

function readPinned() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "dist", "pinned-server.json"), "utf8"));
  } catch {
    return { url: "", allowed: "" };
  }
}

function isLoopbackHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function resolveServerUrl(candidate) {
  const pin = readPinned();
  const pinned = String(pin.url || "").replace(/\/$/, "");
  if (!isDev && pinned) return pinned;
  const allowed = String(pin.allowed || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const url = String(candidate || DEFAULT_SERVER_URL).replace(/\/$/, "");
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return DEFAULT_SERVER_URL;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return DEFAULT_SERVER_URL;
    if (!isDev && allowed.length) {
      const origin = parsed.origin.replace(/\/$/, "").toLowerCase();
      const ok = allowed.some((entry) => {
        try {
          if (entry.includes("://")) return new URL(entry).origin.replace(/\/$/, "").toLowerCase() === origin;
          return entry.toLowerCase() === parsed.host.toLowerCase() || entry.toLowerCase() === parsed.hostname.toLowerCase();
        } catch {
          return false;
        }
      });
      return ok ? url : DEFAULT_SERVER_URL;
    }
    if (!isDev && !isLoopbackHost(parsed.hostname)) return DEFAULT_SERVER_URL;
    return url;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

function configPath() {
  return path.join(app.getPath("userData"), "session.json");
}

function readStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf8"));
    if (raw.tokenEnc && safeStorage.isEncryptionAvailable()) {
      try {
        raw.token = safeStorage.decryptString(Buffer.from(raw.tokenEnc, "base64"));
      } catch {
        raw.token = "";
      }
    }
    delete raw.tokenEnc;
    raw.serverUrl = resolveServerUrl(raw.serverUrl);
    return raw;
  } catch {
    return { serverUrl: resolveServerUrl(DEFAULT_SERVER_URL) };
  }
}

function writeStore(data) {
  const out = { serverUrl: resolveServerUrl(data.serverUrl || DEFAULT_SERVER_URL) };
  if (data.token && safeStorage.isEncryptionAvailable()) {
    out.tokenEnc = safeStorage.encryptString(data.token).toString("base64");
  } else {
    out.token = data.token || "";
  }
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(out, null, 2));
}

function updatesUrl(serverUrl) {
  return `${(serverUrl || DEFAULT_SERVER_URL).replace(/\/$/, "")}/updates`;
}

module.exports = {
  DEFAULT_SERVER_URL,
  isDev,
  resolveServerUrl,
  readStore,
  writeStore,
  updatesUrl,
};
