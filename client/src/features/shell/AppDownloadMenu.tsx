import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { isBrowserClient } from "@/shared/platform";
import { DropdownMenu } from "@/shared/DropdownMenu";

type DownloadLink = { name: string; url: string };

export function AppDownloadMenu() {
  const api = useStore((s) => s.api);
  const [open, setOpen] = useState(false);
  const [installer, setInstaller] = useState<DownloadLink | null>(null);
  const [apk, setApk] = useState<DownloadLink | null>(null);
  const browser = typeof window !== "undefined" && isBrowserClient();

  useEffect(() => {
    if (!browser) return;
    void api.auth
      .clientDownloads()
      .then((res) => {
        setInstaller(res.installer);
        setApk(res.apk);
      })
      .catch(() => {
        setInstaller(null);
        setApk(null);
      });
  }, [browser, api]);

  if (!browser || (!installer && !apk)) return null;

  return (
    <DropdownMenu
      open={open}
      onClose={() => setOpen(false)}
      className="user-menu"
      trigger={
        <button
          type="button"
          className={`notify-btn ${open ? "open" : ""}`}
          title="Скачать приложение"
          aria-label="Скачать приложение"
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 3a1 1 0 0 1 1 1v9.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"
            />
          </svg>
        </button>
      }
    >
      {installer && (
        <a role="menuitem" href={installer.url} onClick={() => setOpen(false)}>
          Windows
        </a>
      )}
      {apk && (
        <a role="menuitem" href={apk.url} onClick={() => setOpen(false)}>
          Android
        </a>
      )}
    </DropdownMenu>
  );
}
