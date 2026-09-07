import type { PickOpt } from "./wearCalcLogic";

export function GearPick({
  query,
  onQuery,
  value,
  onChange,
  options: opts,
  emptyLabel,
  searchPlaceholder,
}: {
  query: string;
  onQuery: (value: string) => void;
  value: number;
  onChange: (value: number) => void;
  options: PickOpt[];
  emptyLabel?: string;
  searchPlaceholder: string;
}) {
  return (
    <div className="wear-pick">
      <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={searchPlaceholder} />
      <span className="select-clip">
        <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {emptyLabel != null && <option value={-1}>{emptyLabel}</option>}
          {opts.map((o) => (
            <option key={o.index} value={o.index}>
              {o.category ? `${o.category}: ${o.name}` : o.name}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}
