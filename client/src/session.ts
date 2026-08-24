const LS_KEY = "rf4spots-session";

export type Session = {
  serverUrl: string;
  token: string;
};

export const DEFAULT_SERVER_URL = "http://127.0.0.1:3780";

const fallback: Session = { serverUrl: DEFAULT_SERVER_URL, token: "" };

function normalizeServerUrl(url: string | undefined): string {
  return (url || DEFAULT_SERVER_URL).replace(/\/$/, "");
}

export async function loadSession(): Promise<Session> {
  if (window.rf4?.storeGet) {
    const s = await window.rf4.storeGet();
    return {
      serverUrl: normalizeServerUrl(s.serverUrl),
      token: s.token || "",
    };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw) as Session;
    return {
      serverUrl: normalizeServerUrl(parsed.serverUrl),
      token: parsed.token || "",
    };
  } catch {
    return { ...fallback };
  }
}

export async function saveSession(session: Session): Promise<void> {
  const data = {
    serverUrl: session.serverUrl.replace(/\/$/, ""),
    token: session.token,
  };
  if (window.rf4?.storeSet) {
    await window.rf4.storeSet(data);
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}
