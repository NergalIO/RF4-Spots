import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];
const WEEK = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toYmd(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

function fmtDay(ymd: string) {
  const p = parseYmd(ymd);
  if (!p) return "";
  return `${pad(p.d)}.${pad(p.m + 1)}.${p.y}`;
}

function cellsFor(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= count; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function DateRangePicker({ from, to, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const initial = parseYmd(from) ?? parseYmd(to) ?? {
    y: new Date().getFullYear(),
    m: new Date().getMonth(),
    d: 1,
  };
  const [view, setView] = useState({ y: initial.y, m: initial.m });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const days = useMemo(() => cellsFor(view.y, view.m), [view]);
  const label =
    from && to
      ? `${fmtDay(from)} — ${fmtDay(to)}`
      : from
        ? `от ${fmtDay(from)}`
        : "От — до";

  function pick(day: number) {
    const value = toYmd(view.y, view.m, day);
    if (!from || (from && to)) {
      onChange(value, "");
      return;
    }
    if (value < from) onChange(value, from);
    else onChange(from, value);
    setOpen(false);
  }

  function inRange(value: string) {
    if (!from || !to) return false;
    return value >= from && value <= to;
  }

  return (
    <div className="range-pick" ref={box}>
      <button type="button" className="range-pick-btn" onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {open && (
        <div className="range-pop">
          <div className="range-nav">
            <button
              type="button"
              onClick={() =>
                setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
              }
            >
              ‹
            </button>
            <strong>
              {MONTHS[view.m]} {view.y}
            </strong>
            <button
              type="button"
              onClick={() =>
                setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
              }
            >
              ›
            </button>
          </div>
          <p className="range-hint">{from && !to ? "Теперь нажмите дату «до»" : "Сначала «от», затем «до»"}</p>
          <div className="range-week">
            {WEEK.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="range-grid">
            {days.map((day, i) => {
              if (!day) return <span key={`e${i}`} />;
              const value = toYmd(view.y, view.m, day);
              const on = value === from || value === to;
              return (
                <button
                  key={value}
                  type="button"
                  className={`${on ? "on" : ""} ${inRange(value) ? "in" : ""}`}
                  onClick={() => pick(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {(from || to) && (
            <button
              type="button"
              className="range-clear"
              onClick={() => {
                onChange("", "");
                setOpen(false);
              }}
            >
              Сбросить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
