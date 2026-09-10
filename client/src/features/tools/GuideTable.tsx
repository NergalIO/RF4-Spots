import { useEffect, useMemo, useRef, useState } from "react";
import type { GuideRow } from "@/types";
import { emptyGuideRow, usesRangeFilter, usesSearchFilter, type GuideField, type GuideKey } from "@/features/tools/guideSchema";
import {
  cellText,
  defaultWidth,
  DEL_W,
  emptyFilter,
  loadWidths,
  PICK_W,
  uniqueTexts,
  sortIndexed,
  type FilterValue,
} from "./guideTableLogic";
import { guideTableWidth, nextSort, onResizeCol, persistGuideWidths } from "./guideTableColumns";
import { GuideTableFilters } from "./GuideTableFilters";

type Props = {
  datasetKey: GuideKey;
  rows: GuideRow[];
  fields: GuideField[];
  canEdit: boolean;
  saving?: boolean;
  error?: string;
  onSave: (rows: GuideRow[]) => Promise<void>;
  selected?: number[];
  onSelect?: (index: number) => void;
  selectHint?: string;
};

export function GuideTable({
  datasetKey,
  rows,
  fields,
  canEdit,
  saving,
  error,
  onSave,
  selected = [],
  onSelect,
  selectHint,
}: Props) {
  const [draft, setDraft] = useState<GuideRow[] | null>(null);
  const [sortKey, setSortKey] = useState(fields[0]?.key ?? "name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, FilterValue>>({});
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState(() => loadWidths(datasetKey, fields));
  const widthsRef = useRef(widths);
  widthsRef.current = widths;
  const data = draft ?? rows;
  const dirty = draft != null;

  useEffect(() => {
    setDraft(null);
    setSlots([]);
    setValues({});
    setFilterOpen(false);
    setAddOpen(false);
    setSortKey(fields[0]?.key ?? "name");
    setSortDir("asc");
    setWidths(loadWidths(datasetKey, fields));
  }, [datasetKey]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!addRef.current?.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    persistGuideWidths(datasetKey, widths);
  }, [datasetKey, widths]);

  const uniqueByField = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const field of fields) {
      if (field.type === "string" && !usesRangeFilter(field) && !usesSearchFilter(field)) {
        map[field.key] = uniqueTexts(data, field.key);
      }
    }
    return map;
  }, [data, fields]);

  const indexed = useMemo(
    () => sortIndexed(data, fields, slots, values, sortKey, sortDir),
    [data, slots, values, fields, sortKey, sortDir],
  );

  const tableWidth = guideTableWidth(fields, widths, { pick: Boolean(onSelect), del: canEdit });

  function patch(index: number, key: string, type: "string" | "number", value: string) {
    setDraft((prev) => {
      const next = [...(prev ?? rows)];
      const row = { ...next[index] };
      row[key] = type === "number" ? (value === "" ? null : Number(value.replace(",", "."))) : value;
      next[index] = row;
      return next;
    });
  }

  return (
    <div className="guide-table">
      <GuideTableFilters
        fields={fields}
        slots={slots}
        values={values}
        uniqueByField={uniqueByField}
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        addRef={addRef}
        addSlot={(key) => {
          const field = fields.find((item) => item.key === key);
          setSlots((prev) => (prev.includes(key) ? prev : [...prev, key]));
          setValues((prev) => ({ ...prev, [key]: prev[key] ?? emptyFilter(field) }));
          setAddOpen(false);
          setFilterOpen(true);
        }}
        removeSlot={(key) => {
          setSlots((prev) => prev.filter((k) => k !== key));
          setValues((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }}
        changeField={(from, to) => {
          if (from === to) return;
          const field = fields.find((item) => item.key === to);
          setSlots((prev) => prev.map((k) => (k === from ? to : k)));
          setValues((prev) => {
            const next = { ...prev };
            delete next[from];
            next[to] = emptyFilter(field);
            return next;
          });
        }}
        patchFilter={(key, patch) => {
          const field = fields.find((item) => item.key === key);
          setValues((prev) => ({ ...prev, [key]: { ...(prev[key] ?? emptyFilter(field)), ...patch } }));
        }}
      />
      <div className="guide-toolbar">
        <span className="muted">
          {indexed.length} из {data.length}
        </span>
        {selectHint && <span className="muted">{selectHint}</span>}
        <div className="spacer" />
        {canEdit && (
          <>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setDraft([...(draft ?? rows), emptyGuideRow(datasetKey)])}
            >
              Строка
            </button>
            {dirty && (
              <>
                <button type="button" className="btn ghost sm" onClick={() => setDraft(null)}>
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn primary sm"
                  disabled={saving}
                  onClick={() => {
                    void onSave(draft)
                      .then(() => setDraft(null))
                      .catch(() => {});
                  }}
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
              </>
            )}
          </>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="guide-scroll">
        <table style={{ width: tableWidth }}>
          <colgroup>
            {onSelect && <col style={{ width: PICK_W }} />}
            {fields.map((field) => (
              <col key={field.key} style={{ width: widths[field.key] ?? defaultWidth(field) }} />
            ))}
            {canEdit && <col style={{ width: DEL_W }} />}
          </colgroup>
          <thead>
            <tr>
              {onSelect && <th className="pick">#</th>}
              {fields.map((field) => (
                <th key={field.key}>
                  <button
                    type="button"
                    className="sort"
                    onClick={() => {
                      const next = nextSort(sortKey, sortDir, field.key);
                      setSortKey(next.key);
                      setSortDir(next.dir);
                    }}
                  >
                    {field.label}
                    {sortKey === field.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                  <span
                    className="col-resizer"
                    onPointerDown={onResizeCol(field.key, fields, widthsRef, setWidths)}
                    onDoubleClick={() => setWidths((cur) => ({ ...cur, [field.key]: defaultWidth(field) }))}
                    title="Потяните, чтобы изменить ширину колонки"
                  />
                </th>
              ))}
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {indexed.length === 0 && (
              <tr>
                <td colSpan={fields.length + (onSelect ? 1 : 0) + (canEdit ? 1 : 0)} className="empty">
                  Нет данных
                </td>
              </tr>
            )}
            {indexed.map(({ row, index }) => (
              <tr key={index} className={selected.includes(index) ? "picked" : ""}>
                {onSelect && (
                  <td className="pick">
                    <button type="button" className="btn ghost sm" onClick={() => onSelect(index)}>
                      {selected.includes(index) ? selected.indexOf(index) + 1 : "＋"}
                    </button>
                  </td>
                )}
                {fields.map((field) => (
                  <td key={field.key}>
                    {canEdit ? (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        step="any"
                        value={row[field.key] ?? ""}
                        onChange={(e) => patch(index, field.key, field.type, e.target.value)}
                      />
                    ) : (
                      cellText(row[field.key])
                    )}
                  </td>
                ))}
                {canEdit && (
                  <td>
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => setDraft((prev) => (prev ?? rows).filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
