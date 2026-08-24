import { createElement, useEffect, useRef } from "react";

type Props = {
  url: string;
  title: string;
  partition: string;
  active?: boolean;
};

export function SiteEmbed({ url, title, partition, active = true }: Props) {
  const frame = useRef<HTMLElement | null>(null);
  const started = useRef(false);
  const electron = typeof window !== "undefined" && Boolean(window.rf4);

  useEffect(() => {
    if (!active || started.current) return;
    const el = frame.current;
    if (!el) return;
    started.current = true;
    el.setAttribute("src", url);
  }, [active, url]);

  if (!electron) {
    return <iframe className="site-webview" title={title} ref={(el) => { frame.current = el; }} />;
  }

  return createElement("webview", {
    ref: frame,
    className: "site-webview",
    partition,
  });
}
