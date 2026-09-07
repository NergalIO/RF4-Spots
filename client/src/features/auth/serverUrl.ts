function trimSlash(url: string) {
  return url.replace(/\/$/, "");
}

function pinnedFromEnv() {
  return trimSlash(String(import.meta.env.VITE_SERVER_URL ?? "").trim());
}

function allowedFromEnv() {
  const pin = pinnedFromEnv();
  const extra = String(import.meta.env.VITE_ALLOWED_SERVERS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return pin ? [pin, ...extra] : extra;
}

function isLoopbackHost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function parseHttpUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Некорректный адрес сервера");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Некорректный адрес сервера");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Нужен адрес http(s)");
  }
  return parsed;
}

function originOf(entry: string) {
  if (entry.includes("://")) return trimSlash(new URL(entry).origin);
  const asHttps = new URL(`https://${entry}`);
  return asHttps.host.toLowerCase();
}

function matchesAllow(url: URL, allowed: string[]) {
  const origin = trimSlash(url.origin).toLowerCase();
  const host = url.host.toLowerCase();
  return allowed.some((entry) => {
    try {
      if (entry.includes("://")) return originOf(entry).toLowerCase() === origin;
      return originOf(entry) === host;
    } catch {
      return entry.toLowerCase() === host || entry.toLowerCase() === url.hostname.toLowerCase();
    }
  });
}

export function defaultServerUrl() {
  return pinnedFromEnv() || "http://127.0.0.1:3780";
}

export function isServerUrlPinned() {
  return Boolean(import.meta.env.PROD && pinnedFromEnv());
}

export function resolveServerUrl(input: string): string {
  const pinned = pinnedFromEnv();
  if (import.meta.env.PROD && pinned) return pinned;

  const url = trimSlash((input || defaultServerUrl()).trim());
  const parsed = parseHttpUrl(url);
  const allowed = allowedFromEnv();

  if (import.meta.env.PROD) {
    if (allowed.length) {
      if (!matchesAllow(parsed, allowed)) throw new Error("Недопустимый адрес сервера");
      return url;
    }
    if (!isLoopbackHost(parsed.hostname)) {
      throw new Error("Адрес сервера не задан при сборке клиента");
    }
  }
  return url;
}
