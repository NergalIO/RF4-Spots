import { defaultServerUrl, resolveServerUrl } from "@/serverUrl";

const LS_KEY = "rf4spots-session";

export type Session = {
  serverUrl: string;
  token: string;
};

export const DEFAULT_SERVER_URL = defaultServerUrl();

const fallback: Session = { serverUrl: DEFAULT_SERVER_URL, token: "" };

function safeUrl(url: string | undefined): string {
  try {
    return resolveServerUrl(url || DEFAULT_SERVER_URL);
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export async function loadSession(): Promise<Session> {
  if (window.rf4?.storeGet) {
    const s = await window.rf4.storeGet();
    return {
      serverUrl: safeUrl(s.serverUrl),
      token: s.token || "",
    };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { serverUrl: DEFAULT_SERVER_URL, token: "" };
    const parsed = JSON.parse(raw) as Session;
    return {
      serverUrl: safeUrl(parsed.serverUrl),
      token: parsed.token || "",
    };
  } catch {
    return { ...fallback };
  }
}

export async function saveSession(session: Session): Promise<void> {
  const data = {
    serverUrl: safeUrl(session.serverUrl),
    token: session.token,
  };
  if (window.rf4?.storeSet) {
    await window.rf4.storeSet(data);
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}
