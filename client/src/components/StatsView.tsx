import { createElement, useEffect, useRef } from "react";

const STAT_URL = "https://rf4-stat.ru/";

type Props = { active?: boolean };

export function StatsView({ active = true }: Props) {
  const frame = useRef<HTMLElement | null>(null);
  const started = useRef(false);
  const electron = typeof window !== "undefined" && Boolean(window.rf4);

  useEffect(() => {
    if (!active || started.current) return;
    const el = frame.current;
    if (!el) return;
    started.current = true;
    el.setAttribute("src", STAT_URL);
  }, [active]);

  if (!electron) {
    return <iframe className="stats-webview" title="RF4-STAT" ref={(el) => { frame.current = el; }} />;
  }

  return createElement("webview", {
    ref: frame,
    className: "stats-webview",
    partition: "persist:rf4stat",
  });
}
