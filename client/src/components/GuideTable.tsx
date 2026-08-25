import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GuideRow } from "../types";
import { asText, emptyGuideRow, type GuideField, type GuideKey } from "../guideSchema";

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

const PICK_W = 44;
const DEL_W = 40;
const MIN_COL = 72;

function cellText(value: unknown) {
  if (value == null || value === "") return "—";
  return String(value);
}

function defaultWidth(field: GuideField) {
  if (field.key === "name") return 220;
  if (field.key === "notes") return 160;
  if (field.key === "category") return 140;
  if (field.key === "size") return 80;
  if (field.key === "test" || field.key === "ratio" || field.key === "capacity") return 110;
  return field.type === "number" ? 96 : 130;
}

function loadWidths(datasetKey: string, fields: GuideField[]): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const field of fields) defaults[field.key] = defaultWidth(field);
  try {
    const raw = localStorage.getItem(`rf4spots-guide-cols:${datasetKey}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const next = { ...defaults };
    for (const field of fields) {
      const n = Number(parsed[field.key]);
      if (Number.isFinite(n)) next[field.key] = Math.max(MIN_COL, Math.round(n));
    }
    return next;
  } catch {
    return defaults;
  }
}

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
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState(fields[0]?.key ?? "name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [category, setCategory] = useState("");
  const [widths, setWidths] = useState(() => loadWidths(datasetKey, fields));
  const widthsRef = useRef(widths);
  widthsRef.current = widths;
  const data = draft ?? rows;
  const dirty = draft != null;

  useEffect(() => {
    setDraft(null);
    setQ("");
    setCategory("");
    setSortKey(fields[0]?.key ?? "name");
    setSortDir("asc");
    setWidths(loadWidths(datasetKey, fields));
  }, [datasetKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`rf4spots-guide-cols:${datasetKey}`, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }, [datasetKey, widths]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const value = asText(row.category);
      if (value) set.add(value);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  const indexed = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = data.map((row, index) => ({ row, index }));
    const filtered = list.filter(({ row }) => {
      if (category && asText(row.category) !== category) return false;
      if (!query) return true;
      return fields.some((field) => asText(row[field.key]).toLowerCase().includes(query));
    });
    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a.row[sortKey];
      const bv = b.row[sortKey];
      const an = typeof av === "number" ? av : Number(av);
      const bn = typeof bv === "number" ? bv : Number(bv);
      if (Number.isFinite(an) && Number.isFinite(bn) && av !== "" && bv !== "") return (an - bn) * dir;
      return asText(av).localeCompare(asText(bv), "ru") * dir;
    });
    return filtered;
  }, [data, q, category, fields, sortKey, sortDir]);

  const tableWidth =
    (onSelect ? PICK_W : 0) +
    fields.reduce((sum, field) => sum + (widths[field.key] ?? defaultWidth(field)), 0) +
    (canEdit ? DEL_W : 0);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function patch(index: number, key: string, type: "string" | "number", value: string) {
    setDraft((prev) => {
      const next = [...(prev ?? rows)];
      const row = { ...next[index] };
      row[key] = type === "number" ? (value === "" ? null : Number(value.replace(",", "."))) : value;
      next[index] = row;
      return next;
    });
  }

  function onResizeCol(key: string) {
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

  return (
    <div className="guide-table">
      <div className="guide-toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск"
          aria-label="Поиск по таблице"
        />
        {categories.length > 1 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
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
                  <button type="button" className="sort" onClick={() => toggleSort(field.key)}>
                    {field.label}
                    {sortKey === field.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                  <span
                    className="col-resizer"
                    onPointerDown={onResizeCol(field.key)}
                    onDoubleClick={() =>
                      setWidths((cur) => ({ ...cur, [field.key]: defaultWidth(field) }))
                    }
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
                      onClick={() =>
                        setDraft((prev) => (prev ?? rows).filter((_, i) => i !== index))
                      }
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
