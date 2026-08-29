import { useMemo, useState } from "react";
import type { GuideRow } from "@/types";
import { asNum, asText } from "@/guideSchema";
import { convertRetrieve } from "@/wear";

type Props = { reels: GuideRow[] };

function reelLabel(row: GuideRow) {
  const cat = asText(row.category);
  const name = asText(row.name);
  const retrieve = asNum(row.retrieve);
  return `${cat ? `${cat}: ` : ""}${name}${retrieve != null ? ` (${retrieve})` : ""}`;
}

export function SpeedCalc({ reels }: Props) {
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [i1, setI1] = useState(0);
  const [i2, setI2] = useState(1);
  const [speed1, setSpeed1] = useState("25");
  const [r1, setR1] = useState("");
  const [r2, setR2] = useState("");

  const list = useMemo(() => {
    return reels
      .map((row, index) => ({ row, index, name: asText(row.name) }))
      .filter((x) => x.name)
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [reels]);

  const opts1 = useMemo(() => {
    const q = q1.trim().toLowerCase();
    return q ? list.filter((x) => reelLabel(x.row).toLowerCase().includes(q)) : list;
  }, [list, q1]);
  const opts2 = useMemo(() => {
    const q = q2.trim().toLowerCase();
    return q ? list.filter((x) => reelLabel(x.row).toLowerCase().includes(q)) : list;
  }, [list, q2]);

  const retrieve1 = Number(r1.replace(",", ".")) || asNum(reels[i1]?.retrieve);
  const retrieve2 = Number(r2.replace(",", ".")) || asNum(reels[i2]?.retrieve);
  const s1 = Number(speed1.replace(",", "."));
  const result = Number.isFinite(s1) && retrieve1 && retrieve2 ? convertRetrieve(s1, retrieve1, retrieve2) : null;

  return (
    <div className="calc-grid two">
      <section className="calc-card">
        <h3>Катушка 1</h3>
        <label>
          Поиск
          <input value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="Название" />
        </label>
        <label>
          Катушка
          <span className="select-clip">
            <select value={i1} onChange={(e) => setI1(Number(e.target.value))}>
              {opts1.map((o) => (
                <option key={o.index} value={o.index}>
                  {reelLabel(o.row)}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label>
          Скорость проводки
          <input value={speed1} onChange={(e) => setSpeed1(e.target.value)} />
        </label>
        <label>
          Смотка, м/мин (если нет в таблице)
          <input value={r1} onChange={(e) => setR1(e.target.value)} placeholder={retrieve1 ? String(retrieve1) : "м/мин"} />
        </label>
      </section>
      <section className="calc-card">
        <h3>Катушка 2</h3>
        <label>
          Поиск
          <input value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="Название" />
        </label>
        <label>
          Катушка
          <span className="select-clip">
            <select value={i2} onChange={(e) => setI2(Number(e.target.value))}>
              {opts2.map((o) => (
                <option key={o.index} value={o.index}>
                  {reelLabel(o.row)}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label>
          Смотка, м/мин (если нет в таблице)
          <input value={r2} onChange={(e) => setR2(e.target.value)} placeholder={retrieve2 ? String(retrieve2) : "м/мин"} />
        </label>
        <p className="calc-weak">
          Эквивалентная скорость: <b>{result == null ? "—" : result.toFixed(2).replace(/\.00$/, "")}</b>
        </p>
        <p className="muted">
          Скорость₂ = скорость₁ × (смотка₁ / смотка₂). Так проводка на второй катушке совпадает с первой.
        </p>
      </section>
    </div>
  );
}
