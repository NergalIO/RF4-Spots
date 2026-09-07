import type { Dispatch, SetStateAction, PointerEvent as ReactPointerEvent } from "react";
import type { GuideField } from "@/features/tools/guideSchema";
import { defaultWidth, DEL_W, MIN_COL, PICK_W } from "./guideTableLogic";

export function guideTableWidth(
  fields: GuideField[],
  widths: Record<string, number>,
  extras: { pick?: boolean; del?: boolean },
) {
  return (
    (extras.pick ? PICK_W : 0) +
    fields.reduce((sum, field) => sum + (widths[field.key] ?? defaultWidth(field)), 0) +
    (extras.del ? DEL_W : 0)
  );
}

export function persistGuideWidths(datasetKey: string, widths: Record<string, number>) {
  try {
    localStorage.setItem(`rf4spots-guide-cols:${datasetKey}`, JSON.stringify(widths));
  } catch {
    /* ignore */
  }
}

export function nextSort(currentKey: string, currentDir: "asc" | "desc", key: string) {
  if (currentKey === key) return { key, dir: currentDir === "asc" ? ("desc" as const) : ("asc" as const) };
  return { key, dir: "asc" as const };
}

export function onResizeCol(
  key: string,
  fields: GuideField[],
  widthsRef: { current: Record<string, number> },
  setWidths: Dispatch<SetStateAction<Record<string, number>>>,
) {
  return (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const field = fields.find((f) => f.key === key);
    const startW = widthsRef.current[key] ?? (field ? defaultWidth(field) : MIN_COL);
    document.body.classList.add("resizing-panels");
    const move = (ev: PointerEvent) => {
      const next = Math.max(MIN_COL, Math.round(startW + ev.clientX - startX));
      setWidths((cur) => ({ ...cur, [key]: next }));
    };
    const up = () => {
      document.body.classList.remove("resizing-panels");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}
