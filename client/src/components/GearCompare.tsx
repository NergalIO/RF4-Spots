import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GuideRow } from "../types";
import { asNum, asText, GUIDE_FIELDS, type GuideKey } from "../guideSchema";
import { GuideTable } from "./GuideTable";

type Props = {
  datasetKey: Extract<GuideKey, "reels" | "rods">;
  rows: GuideRow[];
  canEdit: boolean;
  saving?: boolean;
  error?: string;
  selected: number[];
  onSelect: (index: number) => void;
  onSave: (rows: GuideRow[]) => Promise<void>;
};

const MIN_PANEL = 220;
const MAX_PANEL = 640;
const DEFAULT_PANEL = 320;

function loadPanel(datasetKey: string) {
  try {
    const n = Number(localStorage.getItem(`rf4spots-compare-width:${datasetKey}`));
    if (Number.isFinite(n)) return Math.min(MAX_PANEL, Math.max(MIN_PANEL, Math.round(n)));
  } catch {
    /* ignore */
  }
  return DEFAULT_PANEL;
}

export function GearCompare({ datasetKey, rows, canEdit, saving, error, selected, onSelect, onSave }: Props) {
  const fields = GUIDE_FIELDS[datasetKey];
  const picked = selected.map((i) => rows[i]).filter(Boolean);
  const [panelW, setPanelW] = useState(() => loadPanel(datasetKey));
  const panelRef = useRef(panelW);
  panelRef.current = panelW;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPanelW(loadPanel(datasetKey));
  }, [datasetKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`rf4spots-compare-width:${datasetKey}`, String(panelW));
    } catch {
      /* ignore */
    }
  }, [datasetKey, panelW]);

  const diff = useMemo(() => {
    if (picked.length !== 2) return [];
    const [a, b] = picked;
    return fields
      .filter((f) => f.key !== "name" && f.key !== "notes")
      .map((f) => {
        const left = a[f.key];
        const right = b[f.key];
        const ln = asNum(left);
        const rn = asNum(right);
        let delta: number | null = null;
        if (ln != null && rn != null) delta = rn - ln;
        return { label: f.label, left, right, delta, changed: asText(left) !== asText(right) };
      });
  }, [fields, picked]);

  function onDragPanel(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelRef.current;
    const maxForWrap = () => {
      const w = wrapRef.current?.clientWidth ?? 900;
      return Math.min(MAX_PANEL, Math.max(MIN_PANEL, w - 80));
    };
    document.body.classList.add("resizing-panels");
    const move = (ev: PointerEvent) => {
      const next = Math.min(maxForWrap(), Math.max(MIN_PANEL, Math.round(startW - (ev.clientX - startX))));
      setPanelW(next);
    };
    const up = () => {
      document.body.classList.remove("resizing-panels");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="guide-compare" ref={wrapRef}>
      <GuideTable
        datasetKey={datasetKey}
        rows={rows}
        fields={fields}
        canEdit={canEdit}
        saving={saving}
        error={error}
        onSave={onSave}
        selected={selected}
        onSelect={onSelect}
        selectHint="Выберите две строки для сравнения"
      />
      {picked.length === 2 && (
        <div className="compare-dock" style={{ width: panelW }}>
          <div
            className="resize-handle"
            onPointerDown={onDragPanel}
            onDoubleClick={() => setPanelW(DEFAULT_PANEL)}
            title="Потяните, чтобы изменить ширину панели"
          />
          <aside className="compare-card">
            <h3>
              {asText(picked[0].name)} <span>vs</span> {asText(picked[1].name)}
            </h3>
            <dl>
              {diff.map((row) => (
                <div key={row.label} className={row.changed ? "changed" : ""}>
                  <dt>{row.label}</dt>
                  <dd>
                    <b>{asText(row.left) || "—"}</b>
                    <span>→</span>
                    <b>{asText(row.right) || "—"}</b>
                    {row.delta != null && row.delta !== 0 && (
                      <em className={row.delta > 0 ? "up" : "down"}>
                        {row.delta > 0 ? "+" : ""}
                        {row.delta.toFixed(2).replace(/\.00$/, "")}
                      </em>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
