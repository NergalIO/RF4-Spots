import { useCallback, useEffect, useRef, useState } from "react";
import { useBackGuard } from "@/shared/useBackGuard";
import { useDismissible } from "@/shared/useDismissible";
import { hasNativeNotify, isAndroidApp } from "@/shared/platform";
import { useStore } from "@/store";
import {
  loadNotifySettings,
  notifyChannelsOn,
  notifyEventsOn,
  saveNotifySettings,
  type NotifySettings,
} from "@/notify/settings";
import { bindNotifyClicks, notifyPermission, requestNotifyPermission } from "@/notify/show";
import { previewNotification } from "@/notify/tick";
import { unlockNotifySound } from "@/notify/sound";

let androidNotifyAsked = false;

function windowsLabel() {
  if (isAndroidApp()) return "Уведомления Android";
  return /Windows/i.test(navigator.userAgent) ? "Уведомления Windows" : "Системные уведомления";
}

function Toggle({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: string;
  hint?: string;
}) {
  return (
    <label className="notify-opt">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {children}
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

export function NotifyMenu() {
  const user = useStore((s) => s.user);
  const selectedId = useStore((s) => s.selectedId);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<NotifySettings>(() => loadNotifySettings(user?.id ?? ""));
  const [perm, setPerm] = useState(() => notifyPermission());
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissible(open, close, ref);
  useBackGuard(open, close);

  useEffect(() => {
    if (!user) return;
    setSettings(loadNotifySettings(user.id));
  }, [user]);

  useEffect(() => bindNotifyClicks(), []);

  useEffect(() => {
    if (!user || !isAndroidApp() || !settings.windows || androidNotifyAsked) return;
    if (notifyPermission() === "granted") return;
    androidNotifyAsked = true;
    void requestNotifyPermission().then((next) => {
      setPerm(next);
      if (next === "denied") patch({ windows: false });
    });
  }, [settings.windows, user]);

  function patch(next: Partial<NotifySettings>) {
    if (!user) return;
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveNotifySettings(user.id, merged);
  }

  async function onWindows(v: boolean) {
    unlockNotifySound();
    if (v) {
      const next = await requestNotifyPermission();
      setPerm(next);
      patch({ windows: next !== "denied" && next !== "unsupported" ? v : false });
      return;
    }
    patch({ windows: false });
  }

  const muted = !notifyChannelsOn(settings) || !notifyEventsOn(settings);
  const denied = settings.windows && perm === "denied";
  const unsupported = perm === "unsupported" && !hasNativeNotify();

  return (
    <div className="notify-menu" ref={ref}>
      <button
        type="button"
        className={`notify-btn ${open ? "open" : ""} ${muted ? "muted" : ""}`}
        aria-label="Настройки уведомлений"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Уведомления"
        onClick={() => {
          unlockNotifySound();
          setPerm(notifyPermission());
          if (user) setSettings(loadNotifySettings(user.id));
          setOpen((v) => !v);
        }}
      >
        <BellIcon slashed={muted} />
      </button>
      {open && (
        <div className="notify-panel" role="dialog" aria-label="Настройки уведомлений">
          <p className="notify-panel-title">Уведомления</p>
          <Toggle checked={settings.windows} onChange={(v) => void onWindows(v)}>
            {windowsLabel()}
          </Toggle>
          {denied && <p className="notify-hint">Система запретила всплывающие уведомления.</p>}
          {unsupported && <p className="notify-hint">Этот клиент не умеет показывать системные уведомления.</p>}
          <Toggle checked={settings.sound} onChange={(v) => { unlockNotifySound(); patch({ sound: v }); }}>
            Звук
          </Toggle>
          <Toggle
            checked={settings.whenFocused}
            onChange={(v) => patch({ whenFocused: v })}
            hint={isAndroidApp() ? "иначе только когда приложение свёрнуто" : "иначе только когда окно свёрнуто или в фоне"}
          >
            Когда окно открыто
          </Toggle>
          <p className="notify-panel-title">Новые посты</p>
          <Toggle checked={settings.newPosts} onChange={(v) => patch({ newPosts: v })}>
            Появление нового поста
          </Toggle>
          <p className="notify-panel-title">Комментарии</p>
          <Toggle checked={settings.commentsOwn} onChange={(v) => patch({ commentsOwn: v })}>
            В моих постах
          </Toggle>
          <Toggle checked={settings.commentsFavorite} onChange={(v) => patch({ commentsFavorite: v })}>
            В избранных постах
          </Toggle>
          <Toggle
            checked={settings.commentsAll}
            onChange={(v) => patch({ commentsAll: v })}
            hint="не только мои и избранные"
          >
            Во всех постах
          </Toggle>
          <button
            type="button"
            className="btn ghost sm notify-test"
            onClick={() => {
              unlockNotifySound();
              if (user) void previewNotification(user.id, selectedId ?? undefined);
            }}
          >
            Проверить
          </button>
        </div>
      )}
    </div>
  );
}

function BellIcon({ slashed }: { slashed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a6 6 0 0 0-6 6v2.3c0 .7-.2 1.4-.6 2L4.2 15a1 1 0 0 0 .8 1.6h14a1 1 0 0 0 .8-1.6l-1.2-1.7c-.4-.6-.6-1.3-.6-2V9a6 6 0 0 0-6-6Zm0 18a2.4 2.4 0 0 1-2.3-1.8h4.6A2.4 2.4 0 0 1 12 21Z"
      />
      {slashed && (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          d="M5 5.5 19 19.5"
        />
      )}
    </svg>
  );
}
