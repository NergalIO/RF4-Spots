import type { AdminStats, NamedCount } from "@/types";

export function BarList({ title, rows, empty }: { title: string; rows: NamedCount[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const shownPct = rows.reduce((sum, r) => sum + r.pct, 0);
  const rest = Math.round((100 - shownPct) * 10) / 10;
  return (
    <section className="dash-block">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <>
          <ul className="dash-bars">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="dash-bar-meta">
                  <span>{row.name}</span>
                  <span className="muted">
                    {row.count} · {row.pct}%
                  </span>
                </div>
                <div className="dash-bar-track">
                  <i style={{ width: `${(row.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {rest > 0.4 && <p className="muted dash-rest">ещё {rest}%</p>}
        </>
      )}
    </section>
  );
}

export function Series({
  title,
  rows,
  label,
  tickEvery,
}: {
  title: string;
  rows: { date: string; count: number }[];
  label: (date: string) => string;
  tickEvery: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const last = rows.length - 1;
  return (
    <section className="dash-block">
      <h3>{title}</h3>
      <div className="dash-series">
        {rows.map((row, i) => {
          const tick = i === 0 || i === last || i % tickEvery === 0;
          return (
            <div key={row.date} className="dash-col" title={`${label(row.date)}: ${row.count}`}>
              <div className="dash-col-bar">
                <i style={{ height: `${(row.count / max) * 100}%` }} />
              </div>
              <span>{tick ? label(row.date) : ""}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  trend,
  onClick,
}: {
  label: string;
  value: number | string;
  hint: string;
  trend?: "up" | "down";
  onClick?: () => void;
}) {
  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={trend === "up" ? "dash-up" : trend === "down" ? "dash-down" : undefined}>{hint}</small>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="dash-kpi dash-kpi-btn" onClick={onClick}>
        {body}
      </button>
    );
  }
  return <article className="dash-kpi">{body}</article>;
}

export type { AdminStats };
