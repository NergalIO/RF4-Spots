import { useEffect, useState } from "react";
import { useIsMobile } from "@/platform";
import { useStore } from "@/store";

const APK_CHECK_MS = 5 * 60 * 1000;

function apkVersion(name: string) {
  return /^RF4Spots-(\d+\.\d+\.\d+)\.apk$/i.exec(name)?.[1] ?? "";
}

function isNewer(candidate: string, current: string) {
  const next = candidate.split(".").map(Number);
  const now = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const a = next[i] ?? 0;
    const b = now[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

export function UpdateBanner() {
  const isMobile = useIsMobile();
  const api = useStore((s) => s.api);
  const user = useStore((s) => s.user);
  const [version, setVersion] = useState("");
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isMobile) return;
    const rf4 = window.rf4;
    if (!rf4?.onUpdateReady) return;
    const show = (info: { version?: string }) => {
      setVersion(info?.version ? String(info.version) : "");
      setReady(true);
    };
    const off = rf4.onUpdateReady(show);
    void rf4.updateStatus?.().then((status) => {
      if (status?.ready) show(status);
    });
    return off;
  }, [isMobile]);

  // В APK нет автообновления: сравниваем свою версию с последним APK на сервере.
  useEffect(() => {
    if (!isMobile || !user) return;
    let dead = false;
    const check = async () => {
      try {
        const { apk } = await api.clientDownloads();
        const latest = apk ? apkVersion(apk.name) : "";
        if (dead || !latest || !isNewer(latest, __APP_VERSION__)) return;
        setVersion(latest);
        setReady(true);
      } catch {
        /* сервер недоступен — попробуем в следующий раз */
      }
    };
    void check();
    const timer = setInterval(() => void check(), APK_CHECK_MS);
    return () => {
      dead = true;
      clearInterval(timer);
    };
  }, [isMobile, api, user]);

  if (!ready || dismissed) return null;

  const text = isMobile
    ? `Доступна версия ${version}. Скачайте новый APK и установите поверх текущего.`
    : version
      ? `Доступна версия ${version}. Перезапустите приложение, чтобы установить обновление.`
      : "Доступно обновление. Перезапустите приложение, чтобы установить его.";

  return (
    <div className="update-banner" role="status">
      <p>{text}</p>
      <div className="update-banner-actions">
        <button className="btn ghost sm" type="button" onClick={() => setDismissed(true)}>
          Позже
        </button>
        {isMobile ? (
          <a
            className="btn primary sm"
            href={api.fileUrl("/updates/apk")}
            target="_blank"
            rel="noreferrer"
            onClick={() => setDismissed(true)}
          >
            Скачать
          </a>
        ) : (
          <button
            className="btn primary sm"
            type="button"
            onClick={() => {
              void window.rf4?.installUpdate?.();
            }}
          >
            Перезапустить
          </button>
        )}
      </div>
    </div>
  );
}
