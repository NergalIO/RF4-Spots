const LS_KEY = "rf4spots-session";

export type Session = {
  serverUrl: string;
  token: string;
};

const fallback: Session = { serverUrl: "http://localhost:3780", token: "" };

export async function loadSession(): Promise<Session> {
  if (window.rf4?.storeGet) {
    const s = await window.rf4.storeGet();
    return {
      serverUrl: (s.serverUrl || fallback.serverUrl).replace(/\/$/, ""),
      token: s.token || "",
    };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw) as Session;
    return {
      serverUrl: (parsed.serverUrl || fallback.serverUrl).replace(/\/$/, ""),
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
