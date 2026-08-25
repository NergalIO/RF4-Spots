import type { Request } from "express";
import { envFlag, envList, isProduction } from "./env.js";

export function allowRegister() {
  return envFlag("ALLOW_REGISTER", true);
}

export function requireHttps() {
  return envFlag("REQUIRE_HTTPS", false);
}

export function corsOrigins() {
  const listed = envList("CORS_ORIGINS");
  if (listed.length) return listed;
  if (!isProduction()) return ["http://127.0.0.1:5173", "http://localhost:5173"];
  return [];
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
  if (!origin || origin === "null") {
    cb(null, true);
    return;
  }
  cb(null, corsOrigins().includes(origin));
}
