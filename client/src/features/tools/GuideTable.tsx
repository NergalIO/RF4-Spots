import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GuideRow } from "@/types";
import { emptyGuideRow, usesRangeFilter, usesSearchFilter, type GuideField, type GuideKey } from "@/guideSchema";
import { ValueCombobox } from "@/shared/ui/ValueCombobox";
import {
  cellText,
  defaultWidth,
  DEL_W,
  emptyFilter,
  filterActive,
  loadWidths,
  MIN_COL,
  PICK_W,
  SELECT_MAX,
  sortIndexed,
  uniqueTexts,
  type FilterValue,
} from "./guideTableLogic";

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
    try {
      localStorage.setItem(`rf4spots-guide-cols:${datasetKey}`, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }, [datasetKey, widths]);

  const unusedFields = useMemo(
    () => fields.filter((field) => !slots.includes(field.key)),
    [fields, slots],
  );

  const uniqueByField = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const field of fields) {
      if (field.type === "string" && !usesRangeFilter(field) && !usesSearchFilter(field)) {
        map[field.key] = uniqueTexts(data, field.key);
      }
    }
    return map;
  }, [data, fields]);

  const activeCount = fields.filter((field) => slots.includes(field.key) && filterActive(field, values[field.key])).length;

  const indexed = useMemo(
    () => sortIndexed(data, fields, slots, values, sortKey, sortDir),
    [data, slots, values, fields, sortKey, sortDir],
  );

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

  function addSlot(key: string) {
    setSlots((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setValues((prev) => ({ ...prev, [key]: prev[key] ?? emptyFilter() }));
    setAddOpen(false);
    setFilterOpen(true);
  }

  function removeSlot(key: string) {
    setSlots((prev) => prev.filter((k) => k !== key));
    setValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function patchFilter(key: string, patch: Partial<FilterValue>) {
    setValues((prev) => ({ ...prev, [key]: { ...(prev[key] ?? emptyFilter()), ...patch } }));
  }

  function renderFilterControl(field: GuideField) {
    const spec = values[field.key] ?? emptyFilter();
    if (usesRangeFilter(field)) {
      return (
        <div className="num-range">
          <input
            type="number"
            step="any"
            value={spec.from}
            placeholder="От"
            onChange={(e) => patchFilter(field.key, { from: e.target.value })}
            aria-label={`${field.label}, от`}
          />
          <input
            type="number"
            step="any"
            value={spec.to}
            placeholder="До"
            onChange={(e) => patchFilter(field.key, { to: e.target.value })}
            aria-label={`${field.label}, до`}
          />
        </div>
      );
    }
    if (usesSearchFilter(field)) {
      return (
        <input
          value={spec.text}
          placeholder="Поиск"
          onChange={(e) => patchFilter(field.key, { text: e.target.value })}
          aria-label={`${field.label}, поиск`}
        />
      );
    }
    const options = uniqueByField[field.key] ?? [];
    if (options.length <= SELECT_MAX) {
      return (
        <select
          value={spec.text}
          onChange={(e) => patchFilter(field.key, { text: e.target.value })}
        >
          <option value="">Все значения</option>
          {options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      );
    }
    return (
      <ValueCombobox
        options={options}
        value={spec.text}
        onChange={(text) => patchFilter(field.key, { text })}
        placeholder="Все значения"
        emptyLabel="Все значения"
      />
    );
  }

  return (
    <div className="guide-table">
      <div className="filters-block">
        <button
          type="button"
          className={`filters-toggle ${filterOpen ? "open" : ""}`}
          onClick={() => {
            setFilterOpen((v) => !v);
            setAddOpen(false);
          }}
        >
          <span>Фильтры</span>
          {activeCount > 0 && <span className="count">{activeCount}</span>}
          <span className="filters-chevron">{filterOpen ? "▾" : "▸"}</span>
        </button>
        {filterOpen && (
          <div className="filters">
            {slots.map((key) => {
              const field = fields.find((item) => item.key === key);
              if (!field) return null;
              return (
                <div key={key} className="filter-row">
                  <div className="filter-row-head">
                    <span>{field.label}</span>
                    <button type="button" className="filter-remove" onClick={() => removeSlot(key)} aria-label="Убрать">
                      ×
                    </button>
                  </div>
                  {renderFilterControl(field)}
                </div>
              );
            })}
            {unusedFields.length > 0 && (
              <div className="filter-add-wrap" ref={addRef}>
                <button
                  type="button"
                  className="filter-add"
                  onClick={() => setAddOpen((v) => !v)}
                  aria-label="Добавить фильтр"
                >
                  +
                </button>
                {addOpen && (
                  <div className="filter-add-menu">
                    {unusedFields.map((field) => (
                      <button key={field.key} type="button" onClick={() => addSlot(field.key)}>
                        {field.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {slots.length === 0 && unusedFields.length > 0 && (
              <p className="filter-empty">Нажмите +, чтобы добавить фильтр</p>
            )}
          </div>
        )}
      </div>
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
