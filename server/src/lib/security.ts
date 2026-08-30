import type { Request } from "express";
import { envFlag, envList, isProduction } from "./env.js";

export function allowRegister() {
  return envFlag("ALLOW_REGISTER", false);
}

export function requireHttps() {
  return envFlag("REQUIRE_HTTPS", false);
}

export const ANDROID_WEBVIEW_ORIGIN = "https://appassets.androidplatform.net";

export function corsOrigins() {
  const listed = envList("CORS_ORIGINS");
  const android = [ANDROID_WEBVIEW_ORIGIN];
  if (listed.length) return [...new Set([...listed, ...android])];
  if (!isProduction()) return ["http://127.0.0.1:5173", "http://localhost:5173", ...android];
  return android;
}

export function isLoopbackAddress(value: string | undefined) {
  const ip = (value || "").replace(/^::ffff:/, "");
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

export function isSecureRequest(req: Request) {
  const proto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  return req.secure || proto === "https";
}

export function allowInsecureLocal(req: Request) {
  return isLoopbackAddress(req.ip) || isLoopbackAddress(req.socket.remoteAddress);
}

export function corsOriginDelegate(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  if (!origin) {
    cb(null, true);
    return;
  }
  if (origin === "null") {
    cb(null, !isProduction());
    return;
  }
  cb(null, corsOrigins().includes(origin));
}
