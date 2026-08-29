import { createElement, useEffect, useRef } from "react";

type WebviewLike = HTMLElement & {
  loadURL?: (url: string) => void;
  getURL?: () => string;
};

type Props = {
  url: string;
  title: string;
  partition: string;
  active?: boolean;
  onNavigate?: (url: string) => void;
};

function pageKey(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return url;
  }
}

function currentUrl(el: WebviewLike) {
  try {
    if (typeof el.getURL === "function") {
      const loaded = el.getURL();
      if (loaded) return loaded;
    }
  } catch {
    /* not ready */
  }
  return el.getAttribute("src") || "";
}

function openUrl(el: WebviewLike, url: string) {
  const already = currentUrl(el);
  if (already && typeof el.loadURL === "function") {
    el.loadURL(url);
    return;
  }
  el.setAttribute("src", url);
}

export function SiteEmbed({ url, title, partition, active = true, onNavigate }: Props) {
  const frame = useRef<HTMLElement | null>(null);
  const started = useRef(false);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const electron = typeof window !== "undefined" && Boolean(window.rf4);

  useEffect(() => {
    const el = frame.current as WebviewLike | null;
    if (!el) return;
    if (!started.current && !active) return;
    if (started.current && pageKey(currentUrl(el)) === pageKey(url)) return;
    started.current = true;
    openUrl(el, url);
  }, [active, url]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const handle = (event: Event) => {
      const next = (event as Event & { url?: string }).url || currentUrl(el as WebviewLike);
      if (next) onNavigateRef.current?.(next);
    };
    el.addEventListener("did-navigate", handle);
    el.addEventListener("did-navigate-in-page", handle);
    return () => {
      el.removeEventListener("did-navigate", handle);
      el.removeEventListener("did-navigate-in-page", handle);
    };
  }, []);

  if (!electron) {
    return (
      <iframe
        className="site-webview"
        title={title}
        src={active || started.current ? url : undefined}
        ref={(el) => {
          frame.current = el;
        }}
      />
    );
  }

  return createElement("webview", {
    ref: frame,
    className: "site-webview",
    partition,
  });
}
