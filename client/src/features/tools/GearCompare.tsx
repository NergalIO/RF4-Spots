import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GuideRow } from "@/types";
import { asText, GUIDE_FIELDS, type GuideField, type GuideKey } from "@/guideSchema";
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
const DEFAULT_PANEL = 360;
const SKIP_BEST = new Set(["name", "notes", "category"]);
const LOWER_BETTER = new Set(["price", "weight"]);

function loadPanel(datasetKey: string) {
  try {
    const n = Number(localStorage.getItem(`rf4spots-compare-width:${datasetKey}`));
    if (Number.isFinite(n)) return Math.min(MAX_PANEL, Math.max(MIN_PANEL, Math.round(n)));
  } catch {
    /* ignore */
  }
  return DEFAULT_PANEL;
}

function parseCompareNum(value: unknown, key: string): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if ((key === "price" || key === "weight") && value === 0) return null;
    return value;
  }
  const text = String(value).trim().replace(/\u00a0/g, " ").replace(",", ".");
  if (!text) return null;
  const direct = Number(text);
  if (Number.isFinite(direct)) {
    if ((key === "price" || key === "weight") && direct === 0) return null;
    return direct;
  }
  const ratio = text.match(/(\d+(?:\.\d+)?)\s*:\s*\d/);
  if (ratio) return Number(ratio[1]);
  const nums = [...text.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return nums.length >= 2 ? Math.max(...nums) : nums[0];
}

function winningIndexes(values: unknown[], field: GuideField): Set<number> {
  if (SKIP_BEST.has(field.key)) return new Set();
  const nums = values.map((value) => parseCompareNum(value, field.key));
  const filled = nums.flatMap((n, i) => (n == null ? [] : [{ n, i }]));
  if (filled.length < 2) return new Set();
  const best = LOWER_BETTER.has(field.key)
    ? Math.min(...filled.map((x) => x.n))
    : Math.max(...filled.map((x) => x.n));
  const winners = filled.filter((x) => x.n === best).map((x) => x.i);
  if (winners.length === values.length) return new Set();
  return new Set(winners);
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

  const specFields = useMemo(
    () => fields.filter((f) => f.key !== "name" && f.key !== "notes"),
    [fields],
  );

  const diff = useMemo(() => {
    if (picked.length < 2) return [];
    return specFields.map((field) => {
      const values = picked.map((row) => row[field.key]);
      return {
        key: field.key,
        label: field.label,
        values,
        best: winningIndexes(values, field),
      };
    });
  }, [specFields, picked]);

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
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Параметр</th>
                  {picked.map((row, i) => (
                    <th key={i}>{asText(row.name) || `Вариант ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diff.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    {row.values.map((value, i) => {
                      const text = asText(value).trim();
                      return (
                        <td key={i} className={row.best.has(i) ? "best" : text ? undefined : "empty"}>
                          {text || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </aside>
        </div>
      )}
    </div>
  );
}
