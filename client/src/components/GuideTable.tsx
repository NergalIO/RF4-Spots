import { useMemo, useState } from "react";
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

function cellText(value: unknown) {
  if (value == null || value === "") return "—";
  return String(value);
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
  const data = draft ?? rows;
  const dirty = draft != null;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const value = asText(row.category);
      if (value) set.add(value);
    }
    return [...set];
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
        <span className="muted">{indexed.length} из {data.length}</span>
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
        <table>
          <thead>
            <tr>
              {onSelect && <th className="pick">#</th>}
              {fields.map((field) => (
                <th key={field.key}>
                  <button type="button" className="sort" onClick={() => toggleSort(field.key)}>
                    {field.label}
                    {sortKey === field.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
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
