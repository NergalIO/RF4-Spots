import { useMemo, useState } from "react";
import type { GuideRow } from "../types";
import { asNum, asText } from "../guideSchema";
import { fmtKg, remainBase, remainLinear } from "../wear";

type Props = {
  reels: GuideRow[];
  rods: GuideRow[];
  hooks: GuideRow[];
};

function options(rows: GuideRow[]) {
  return rows
    .map((row, index) => ({ index, name: asText(row.name), category: asText(row.category) }))
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function hookLabel(row: GuideRow | undefined) {
  if (!row) return "";
  const name = asText(row.name);
  const size = asText(row.size);
  return [name, size].filter(Boolean).join(" ");
}

function hookOptions(rows: GuideRow[]) {
  return rows
    .map((row, index) => ({
      index,
      name: hookLabel(row),
      category: asText(row.category),
      search: `${asText(row.name)} ${asText(row.size)} ${asText(row.category)}`.toLowerCase(),
    }))
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function WearCalc({ reels, rods, hooks }: Props) {
  const [rodI, setRodI] = useState(0);
  const [reelI, setReelI] = useState(0);
  const [hookI, setHookI] = useState(-1);
  const [rodWear, setRodWear] = useState(0);
  const [gearWear, setGearWear] = useState(0);
  const [dragWear, setDragWear] = useState(0);
  const [hookWear, setHookWear] = useState(0);
  const [lineKg, setLineKg] = useState("");
  const [lineWear, setLineWear] = useState(0);
  const [rodQ, setRodQ] = useState("");
  const [reelQ, setReelQ] = useState("");
  const [hookQ, setHookQ] = useState("");

  const rodOpts = useMemo(() => {
    const q = rodQ.trim().toLowerCase();
    const all = options(rods);
    return q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all;
  }, [rods, rodQ]);
  const reelOpts = useMemo(() => {
    const q = reelQ.trim().toLowerCase();
    const all = options(reels);
    return q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all;
  }, [reels, reelQ]);
  const hookOpts = useMemo(() => {
    const q = hookQ.trim().toLowerCase();
    const all = hookOptions(hooks);
    const filtered = q ? all.filter((r) => r.search.includes(q)) : all;
    if (hookI >= 0 && !filtered.some((r) => r.index === hookI)) {
      const current = all.find((r) => r.index === hookI);
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [hooks, hookQ, hookI]);

  const rod = rods[rodI];
  const reel = reels[reelI];
  const hook = hookI >= 0 ? hooks[hookI] : undefined;
  const blankKg = asNum(rod?.blankKg) ?? 0;
  const gearKg = asNum(reel?.gearKg) ?? 0;
  const dragKg = asNum(reel?.dragKg);
  const hookKg = asNum(hook?.strengthKg);
  const line = Number(lineKg.replace(",", "."));

  const blankLeft = blankKg ? remainBase(blankKg, rodWear) : null;
  const gearLeft = gearKg ? remainBase(gearKg, gearWear) : null;
  const dragLeft = dragKg != null ? remainLinear(dragKg, dragWear) : null;
  const hookLeft = hookKg != null && hookKg > 0 ? remainLinear(hookKg, hookWear) : null;
  const lineLeft = Number.isFinite(line) && line > 0 ? remainLinear(line, lineWear) : null;

  const parts = [
    { name: "Бланк удочки", kg: blankLeft },
    { name: "Шестерня катушки", kg: gearLeft },
    { name: "Фрикцион", kg: dragLeft },
    { name: "Крючок", kg: hookLeft },
    { name: "Леска / поводок", kg: lineLeft },
  ].filter((p) => p.kg != null) as { name: string; kg: number }[];
  const weakest = parts.reduce<(typeof parts)[0] | null>((best, p) => (!best || p.kg < best.kg ? p : best), null);
  const others = parts.filter((p) => p.name !== "Шестерня катушки");
  const weakestOther = others.reduce<(typeof parts)[0] | null>((best, p) => (!best || p.kg < best.kg ? p : best), null);
  const warn = Boolean(gearLeft && weakestOther && weakestOther.kg > gearLeft);

  return (
    <div className="calc-grid wear">
      <section className="calc-card">
        <h3>Удилище</h3>
        <label>
          Поиск
          <input value={rodQ} onChange={(e) => setRodQ(e.target.value)} placeholder="Название" />
        </label>
        <label>
          Удилище
          <span className="select-clip">
            <select value={rodI} onChange={(e) => setRodI(Number(e.target.value))}>
              {rodOpts.map((o) => (
                <option key={o.index} value={o.index}>
                  {o.category ? `${o.category}: ${o.name}` : o.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <p className="muted">Бланк без износа: {fmtKg(blankKg || null)}</p>
        <label>
          Износ бланка, %
          <input type="number" min={0} max={100} value={rodWear} onChange={(e) => setRodWear(Number(e.target.value))} />
        </label>
      </section>
      <section className="calc-card">
        <h3>Катушка</h3>
        <label>
          Поиск
          <input value={reelQ} onChange={(e) => setReelQ(e.target.value)} placeholder="Название" />
        </label>
        <label>
          Катушка
          <span className="select-clip">
            <select value={reelI} onChange={(e) => setReelI(Number(e.target.value))}>
              {reelOpts.map((o) => (
                <option key={o.index} value={o.index}>
                  {o.category ? `${o.category}: ${o.name}` : o.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <p className="muted">Шестерня без износа: {fmtKg(gearKg || null)}</p>
        <label>
          Износ шестерни, %
          <input type="number" min={0} max={100} value={gearWear} onChange={(e) => setGearWear(Number(e.target.value))} />
        </label>
        {dragKg != null && (
          <label>
            Износ фрикциона, %
            <input type="number" min={0} max={100} value={dragWear} onChange={(e) => setDragWear(Number(e.target.value))} />
          </label>
        )}
      </section>
      <section className="calc-card">
        <h3>Крючок</h3>
        <label>
          Поиск
          <input value={hookQ} onChange={(e) => setHookQ(e.target.value)} placeholder="CHK101 S10" />
        </label>
        <label>
          Крючок
          <span className="select-clip">
            <select value={hookI} onChange={(e) => setHookI(Number(e.target.value))}>
              <option value={-1}>Не выбран</option>
              {hookOpts.map((o) => (
                <option key={o.index} value={o.index}>
                  {o.category ? `${o.category}: ${o.name}` : o.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <p className="muted">
          Прочность без износа: {fmtKg(hookKg)}
          {asText(hook?.notes) ? ` (${asText(hook?.notes)})` : ""}
        </p>
        <label>
          Износ крючка, %
          <input type="number" min={0} max={100} value={hookWear} onChange={(e) => setHookWear(Number(e.target.value))} />
        </label>
      </section>
      <section className="calc-card">
        <h3>Слабое звено</h3>
        <label>
          Леска / поводок, кг
          <input value={lineKg} onChange={(e) => setLineKg(e.target.value)} placeholder="необязательно" />
        </label>
        <label>
          Износ лески, %
          <input type="number" min={0} max={100} value={lineWear} onChange={(e) => setLineWear(Number(e.target.value))} />
        </label>
        <ul className="calc-result">
          <li>Бланк: <b>{fmtKg(blankLeft)}</b></li>
          <li>Шестерня: <b>{fmtKg(gearLeft)}</b></li>
          {dragLeft != null && <li>Фрикцион: <b>{fmtKg(dragLeft)}</b></li>}
          {hookLeft != null && <li>Крючок: <b>{fmtKg(hookLeft)}</b></li>}
          {lineLeft != null && <li>Леска: <b>{fmtKg(lineLeft)}</b></li>}
        </ul>
        {weakest && (
          <p className="calc-weak">
            Самое слабое: <b>{weakest.name}</b> — {fmtKg(weakest.kg)}
          </p>
        )}
        {warn && (
          <p className="form-error">
            Слабая часть сборки ({weakestOther?.name}, {fmtKg(weakestOther?.kg)}) прочнее шестерни катушки ({fmtKg(gearLeft)}).
            Механизм будет узким местом.
          </p>
        )}
      </section>
    </div>
  );
}
