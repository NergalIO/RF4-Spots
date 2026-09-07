import { fmtKg, fmtPct } from "@/features/tools/wear";
import type { WearResultRow } from "./wearCalcLogic";

export function WearCalcResults({
  rows,
  weakestId,
  blankSafe,
  gearSafe,
  warn,
  weakestOtherName,
  weakestOtherLeft,
  gearLeft,
}: {
  rows: WearResultRow[];
  weakestId?: string;
  blankSafe: number | null;
  gearSafe: number | null;
  warn: boolean;
  weakestOtherName?: string;
  weakestOtherLeft: number | null;
  gearLeft: number | null;
}) {
  return (
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
            {rows.map((row) => (
              <tr key={row.id} className={weakestId === row.id ? "weak" : undefined}>
                <th scope="row">{row.name}</th>
                <td>{fmtKg(row.stock)}</td>
                <td>{fmtKg(row.left)}</td>
                <td>{row.id === "blank" ? fmtPct(blankSafe) : row.id === "gear" ? fmtPct(gearSafe) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {warn && (
        <p className="form-error">
          Слабая часть сборки ({weakestOtherName}, {fmtKg(weakestOtherLeft)}) прочнее механизма катушки (
          {fmtKg(gearLeft)}). Механизм будет узким местом.
        </p>
      )}
    </section>
  );
}
