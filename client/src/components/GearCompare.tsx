import { useMemo } from "react";
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

export function GearCompare({ datasetKey, rows, canEdit, saving, error, selected, onSelect, onSave }: Props) {
  const fields = GUIDE_FIELDS[datasetKey];
  const picked = selected.map((i) => rows[i]).filter(Boolean);

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

  return (
    <div className="guide-compare">
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
      )}
    </div>
  );
}
