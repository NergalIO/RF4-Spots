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

type PageWindow = {
  rf4?: unknown;
  rf4Android?: unknown;
  location?: { origin?: string };
};

export function pageOrigin(win: PageWindow | undefined = typeof window === "undefined" ? undefined : window) {
  if (!win || win.rf4 || win.rf4Android) return "";
  const origin = win.location?.origin;
  return origin ? trimSlash(origin) : "";
}

export function allowResolvedUrl(parsed: URL, allowed: string[], origin: string) {
  if (allowed.length) return matchesAllow(parsed, allowed);
  if (origin && trimSlash(parsed.origin) === origin) return true;
  return isLoopbackHost(parsed.hostname);
}

export function pickDefaultServerUrl(pinned: string, origin: string, prod: boolean) {
  return pinned || (prod ? origin : "") || "http://127.0.0.1:3780";
}

export function defaultServerUrl() {
  return pickDefaultServerUrl(pinnedFromEnv(), pageOrigin(), Boolean(import.meta.env.PROD));
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

  if (import.meta.env.PROD && !allowResolvedUrl(parsed, allowed, pageOrigin())) {
    throw new Error(allowed.length ? "Недопустимый адрес сервера" : "Адрес сервера не задан при сборке клиента");
  }
  return url;
}
