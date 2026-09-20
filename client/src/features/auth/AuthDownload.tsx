import { useEffect, useState } from "react";
import { Api } from "@/api";
import { defaultServerUrl } from "@/features/auth/serverUrl";
import { isBrowserClient } from "@/shared/platform";
import { DropdownMenu } from "@/shared/DropdownMenu";

type DownloadLink = { name: string; url: string };

export function AuthDownload() {
  const [open, setOpen] = useState(false);
  const [installer, setInstaller] = useState<DownloadLink | null>(null);
  const [apk, setApk] = useState<DownloadLink | null>(null);
  const browser = typeof window !== "undefined" && isBrowserClient();

  useEffect(() => {
    if (!browser) return;
    const api = new Api(defaultServerUrl(), "");
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
  }, [browser]);

  if (!browser || (!installer && !apk)) return null;

  return (
    <DropdownMenu
      open={open}
      onClose={() => setOpen(false)}
      className="user-menu auth-download"
      trigger={
        <button type="button" className="btn ghost" onClick={() => setOpen((v) => !v)}>
          Скачать
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
