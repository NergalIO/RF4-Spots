import { useEffect, useState } from "react";

export function UpdateBanner() {
  const [version, setVersion] = useState("");
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
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
  }, []);

  if (!ready || dismissed) return null;

  const text = version
    ? `Доступна версия ${version}. Перезапустите приложение, чтобы установить обновление.`
    : "Доступно обновление. Перезапустите приложение, чтобы установить его.";

  return (
    <div className="update-banner" role="status">
      <p>{text}</p>
      <div className="update-banner-actions">
        <button
          className="btn ghost sm"
          type="button"
          onClick={() => setDismissed(true)}
        >
          Позже
        </button>
        <button
          className="btn primary sm"
          type="button"
          onClick={() => {
            void window.rf4?.installUpdate?.();
          }}
        >
          Перезапустить
        </button>
      </div>
    </div>
  );
}
