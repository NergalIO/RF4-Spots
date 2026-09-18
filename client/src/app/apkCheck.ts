const APK_CHECK_KEY = "rf4spots-apk-check";
export const APK_CHECK_MS = 30 * 60 * 1000;

type ApkCheck = { at: number; latest: string };

function readRecord(): ApkCheck | null {
  try {
    const raw = localStorage.getItem(APK_CHECK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApkCheck>;
    if (typeof parsed.at !== "number" || typeof parsed.latest !== "string") return null;
    return { at: parsed.at, latest: parsed.latest };
  } catch {
    return null;
  }
}

export function readCachedApkLatest() {
  return readRecord()?.latest ?? "";
}

export function shouldFetchApkCheck(now = Date.now()) {
  const rec = readRecord();
  if (!rec) return true;
  return now - rec.at >= APK_CHECK_MS;
}

export function rememberApkCheck(latest: string, now = Date.now()) {
  try {
    localStorage.setItem(APK_CHECK_KEY, JSON.stringify({ at: now, latest } satisfies ApkCheck));
  } catch {
    /* ignore */
  }
}
