import { useMemo, useState } from "react";
import type { GuideRow } from "@/types";
import { asNum, asText } from "@/features/tools/guideSchema";
import { fmtKg } from "@/features/tools/wear";
import { GearPick } from "./GearPick";
import { WearCalcResults } from "./WearCalcResults";
import { buildResultRows, computeWeakest, hookOptions, options, parseKg, safeWear } from "./wearCalcLogic";

type Props = {
  reels: GuideRow[];
  rods: GuideRow[];
  hooks: GuideRow[];
};

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
    const filtered = q ? all.filter((r) => r.search?.includes(q)) : all;
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
  const resultRows = buildResultRows({
    blankKg,
    gearKg,
    dragKg,
    hookKg,
    line,
    leader,
    rodWear,
    gearWear,
    dragWear,
    hookWear,
    lineWear,
    leaderWear,
  });
  const { weakest, weakestOther, warn, weakestExcept } = computeWeakest(resultRows);
  const gearLeft = resultRows.find((row) => row.id === "gear")?.left ?? null;
  const blankSafe = safeWear(blankKg, weakestExcept("blank"));
  const gearSafe = safeWear(gearKg, weakestExcept("gear"));

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
                  <GearPick query={rodQ} onQuery={setRodQ} value={rodI} onChange={setRodI} options={rodOpts} searchPlaceholder="Название удочки" />
                </td>
                <td>{fmtKg(blankKg || null)}</td>
                <td>
                  <input className="wear-pct" type="number" min={0} max={100} value={rodWear} onChange={(e) => setRodWear(Number(e.target.value))} />
                </td>
              </tr>
              <tr>
                <th scope="row">Катушка</th>
                <td>
                  <GearPick query={reelQ} onQuery={setReelQ} value={reelI} onChange={setReelI} options={reelOpts} searchPlaceholder="Название катушки" />
                </td>
                <td>{fmtKg(gearKg || null)}</td>
                <td>
                  <input className="wear-pct" type="number" min={0} max={100} value={gearWear} onChange={(e) => setGearWear(Number(e.target.value))} />
                </td>
              </tr>
              <tr>
                <th scope="row">Фрикцион</th>
                <td className="muted">{asText(reel?.name) || "—"}</td>
                <td>{fmtKg(dragKg)}</td>
                <td>
                  <input className="wear-pct" type="number" min={0} max={100} value={dragWear} onChange={(e) => setDragWear(Number(e.target.value))} disabled={dragKg == null} />
                </td>
              </tr>
              <tr>
                <th scope="row">Крючок</th>
                <td>
                  <GearPick query={hookQ} onQuery={setHookQ} value={hookI} onChange={setHookI} options={hookOpts} emptyLabel="Не выбран" searchPlaceholder="CHK101 S10" />
                </td>
                <td>
                  {fmtKg(hookKg)}
                  {asText(hook?.notes) ? ` (${asText(hook?.notes)})` : ""}
                </td>
                <td>
                  <input className="wear-pct" type="number" min={0} max={100} value={hookWear} onChange={(e) => setHookWear(Number(e.target.value))} disabled={hookI < 0} />
                </td>
              </tr>
              <tr>
                <th scope="row">Леска</th>
                <td>
                  <input className="wear-kg" value={lineKg} onChange={(e) => setLineKg(e.target.value)} placeholder="кг" />
                </td>
                <td>{fmtKg(line)}</td>
                <td>
                  <input className="wear-pct" type="number" min={0} max={100} value={lineWear} onChange={(e) => setLineWear(Number(e.target.value))} />
                </td>
              </tr>
              <tr>
                <th scope="row">Поводок</th>
                <td>
                  <input className="wear-kg" value={leaderKg} onChange={(e) => setLeaderKg(e.target.value)} placeholder="кг" />
                </td>
                <td>{fmtKg(leader)}</td>
                <td>
                  <input className="wear-pct" type="number" min={0} max={100} value={leaderWear} onChange={(e) => setLeaderWear(Number(e.target.value))} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <WearCalcResults
        rows={resultRows}
        weakestId={weakest?.id}
        blankSafe={blankSafe}
        gearSafe={gearSafe}
        warn={warn}
        weakestOtherName={weakestOther?.name}
        weakestOtherLeft={weakestOther?.left ?? null}
        gearLeft={gearLeft}
      />
    </div>
  );
}
