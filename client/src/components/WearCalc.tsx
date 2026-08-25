import { useMemo, useState } from "react";
import type { GuideRow } from "../types";
import { asNum, asText } from "../guideSchema";
import { fmtKg, fmtPct, maxWearUntil, remainBase, remainLinear } from "../wear";

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

function parseKg(text: string) {
  const n = Number(text.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function minDefined(values: Array<number | null>) {
  const nums = values.filter((n): n is number => n != null);
  return nums.length ? Math.min(...nums) : null;
}

type PickOpt = { index: number; name: string; category: string };

function GearPick({
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
  const [leaderKg, setLeaderKg] = useState("");
  const [leaderWear, setLeaderWear] = useState(0);
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
  const line = parseKg(lineKg);
  const leader = parseKg(leaderKg);

  const blankLeft = blankKg ? remainBase(blankKg, rodWear) : null;
  const gearLeft = gearKg ? remainBase(gearKg, gearWear) : null;
  const dragLeft = dragKg != null ? remainLinear(dragKg, dragWear) : null;
  const hookLeft = hookKg != null && hookKg > 0 ? remainLinear(hookKg, hookWear) : null;
  const lineLeft = line != null ? remainLinear(line, lineWear) : null;
  const leaderLeft = leader != null ? remainLinear(leader, leaderWear) : null;

  const resultRows = [
    { id: "blank", name: "Удилище", stock: blankKg || null, left: blankLeft },
    { id: "gear", name: "Механизм катушки", stock: gearKg || null, left: gearLeft },
    { id: "drag", name: "Фрикцион", stock: dragKg, left: dragLeft },
    { id: "hook", name: "Крючок", stock: hookKg, left: hookLeft },
    { id: "line", name: "Леска", stock: line, left: lineLeft },
    { id: "leader", name: "Поводок", stock: leader, left: leaderLeft },
  ];
  const loadRows = resultRows.filter((row) => row.id !== "drag" && row.left != null);
  const weakest = loadRows.reduce<(typeof loadRows)[0] | null>(
    (best, row) => (!best || (row.left ?? Infinity) < (best.left ?? Infinity) ? row : best),
    null,
  );
  const others = loadRows.filter((row) => row.id !== "gear");
  const weakestOther = others.reduce<(typeof others)[0] | null>(
    (best, row) => (!best || (row.left ?? Infinity) < (best.left ?? Infinity) ? row : best),
    null,
  );
  const warn = Boolean(gearLeft && weakestOther?.left != null && weakestOther.left > gearLeft);

  const weakestExcept = (id: string) =>
    minDefined(loadRows.filter((row) => row.id !== id).map((row) => row.left));
  const blankSafe = blankKg ? maxWearUntil(blankKg, weakestExcept("blank") ?? NaN) : null;
  const gearSafe = gearKg ? maxWearUntil(gearKg, weakestExcept("gear") ?? NaN) : null;

  return (
    <div className="wear-calc">
      <section>
        <h3>Сборка</h3>
        <div className="wear-scroll">
          <table className="wear-table">
            <thead>
              <tr>
                <th>Часть</th>
                <th>Снасть</th>
                <th>Сток</th>
                <th>Износ, %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Удилище</th>
                <td>
                  <GearPick
                    query={rodQ}
                    onQuery={setRodQ}
                    value={rodI}
                    onChange={setRodI}
                    options={rodOpts}
                    searchPlaceholder="Название удочки"
                  />
                </td>
                <td>{fmtKg(blankKg || null)}</td>
                <td>
                  <input
                    className="wear-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={rodWear}
                    onChange={(e) => setRodWear(Number(e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Катушка</th>
                <td>
                  <GearPick
                    query={reelQ}
                    onQuery={setReelQ}
                    value={reelI}
                    onChange={setReelI}
                    options={reelOpts}
                    searchPlaceholder="Название катушки"
                  />
                </td>
                <td>{fmtKg(gearKg || null)}</td>
                <td>
                  <input
                    className="wear-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={gearWear}
                    onChange={(e) => setGearWear(Number(e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Фрикцион</th>
                <td className="muted">{asText(reel?.name) || "—"}</td>
                <td>{fmtKg(dragKg)}</td>
                <td>
                  <input
                    className="wear-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={dragWear}
                    onChange={(e) => setDragWear(Number(e.target.value))}
                    disabled={dragKg == null}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Крючок</th>
                <td>
                  <GearPick
                    query={hookQ}
                    onQuery={setHookQ}
                    value={hookI}
                    onChange={setHookI}
                    options={hookOpts}
                    emptyLabel="Не выбран"
                    searchPlaceholder="CHK101 S10"
                  />
                </td>
                <td>
                  {fmtKg(hookKg)}
                  {asText(hook?.notes) ? ` (${asText(hook?.notes)})` : ""}
                </td>
                <td>
                  <input
                    className="wear-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={hookWear}
                    onChange={(e) => setHookWear(Number(e.target.value))}
                    disabled={hookI < 0}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Леска</th>
                <td>
                  <input
                    className="wear-kg"
                    value={lineKg}
                    onChange={(e) => setLineKg(e.target.value)}
                    placeholder="кг"
                  />
                </td>
                <td>{fmtKg(line)}</td>
                <td>
                  <input
                    className="wear-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={lineWear}
                    onChange={(e) => setLineWear(Number(e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Поводок</th>
                <td>
                  <input
                    className="wear-kg"
                    value={leaderKg}
                    onChange={(e) => setLeaderKg(e.target.value)}
                    placeholder="кг"
                  />
                </td>
                <td>{fmtKg(leader)}</td>
                <td>
                  <input
                    className="wear-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={leaderWear}
                    onChange={(e) => setLeaderWear(Number(e.target.value))}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Результат</h3>
        <div className="wear-scroll">
          <table className="wear-table">
            <thead>
              <tr>
                <th>Часть</th>
                <th>Сток</th>
                <th>Остаток</th>
                <th>Безопасный износ</th>
              </tr>
            </thead>
            <tbody>
              {resultRows.map((row) => (
                <tr key={row.id} className={weakest?.id === row.id ? "weak" : undefined}>
                  <th scope="row">{row.name}</th>
                  <td>{fmtKg(row.stock)}</td>
                  <td>{fmtKg(row.left)}</td>
                  <td>
                    {row.id === "blank" ? fmtPct(blankSafe) : row.id === "gear" ? fmtPct(gearSafe) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {warn && (
          <p className="form-error">
            Слабая часть сборки ({weakestOther?.name}, {fmtKg(weakestOther?.left)}) прочнее механизма катушки (
            {fmtKg(gearLeft)}). Механизм будет узким местом.
          </p>
        )}
      </section>
    </div>
  );
}
