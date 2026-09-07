import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const LS_KEY = "rf4spots-panels";
const MIN = 240;
const MAX = 640;

export type PanelLayout = {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
};

const defaults: PanelLayout = {
  leftOpen: true,
  rightOpen: true,
  leftWidth: 300,
  rightWidth: 340,
};

function load(): PanelLayout {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<PanelLayout>;
    return {
      leftOpen: parsed.leftOpen ?? true,
      rightOpen: parsed.rightOpen ?? true,
      leftWidth: clamp(parsed.leftWidth ?? defaults.leftWidth),
      rightWidth: clamp(parsed.rightWidth ?? defaults.rightWidth),
    };
  } catch {
    return { ...defaults };
  }
}

function clamp(n: number) {
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

export function useResizablePanels() {
  const [layout, setLayout] = useState<PanelLayout>(load);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const dragRef = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(layout));
  }, [layout]);

  const setLeftOpen = useCallback((open: boolean | ((v: boolean) => boolean)) => {
    setLayout((cur) => ({ ...cur, leftOpen: typeof open === "function" ? open(cur.leftOpen) : open }));
  }, []);

  const setRightOpen = useCallback((open: boolean | ((v: boolean) => boolean)) => {
    setLayout((cur) => ({ ...cur, rightOpen: typeof open === "function" ? open(cur.rightOpen) : open }));
  }, []);

  const onDrag = useCallback((side: "left" | "right") => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current = side;
    const startX = e.clientX;
    const startW = side === "left" ? layoutRef.current.leftWidth : layoutRef.current.rightWidth;
    document.body.classList.add("resizing-panels");

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const next = clamp(side === "left" ? startW + dx : startW - dx);
      setLayout((cur) =>
        side === "left" ? { ...cur, leftWidth: next } : { ...cur, rightWidth: next },
      );
    };
    const up = () => {
      dragRef.current = null;
      document.body.classList.remove("resizing-panels");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, []);

  const resetWidth = useCallback((side: "left" | "right") => {
    setLayout((cur) =>
      side === "left"
        ? { ...cur, leftWidth: defaults.leftWidth }
        : { ...cur, rightWidth: defaults.rightWidth },
    );
  }, []);

  return { ...layout, setLeftOpen, setRightOpen, onDrag, resetWidth, dragging: dragRef };
}
