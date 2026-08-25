import { useEffect, useMemo, useState } from "react";
import {
  dayNet,
  emptyOp,
  fmtAmount,
  loadEarnings,
  parseAmount,
  saveEarnings,
  startOfDay,
  todayYmd,
  type EarningsOp,
  type OpKind,
} from "../earnings";

function patchOp(list: EarningsOp[], id: string, patch: Partial<EarningsOp>) {
  return list.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function amountText(value: number) {
  if (!value) return "";
  return String(value);
}

export function EarningsCalc() {
  const [state, setState] = useState(() => loadEarnings());
  const [date, setDate] = useState(() => todayYmd());
  const operations = state.operations ?? [];
  const openings = state.openings ?? {};

  useEffect(() => {
    try {
      saveEarnings(state);
    } catch {
      /* ignore quota / private mode */
    }
  }, [state]);

  const dayOps = useMemo(() => operations.filter((op) => op.date === date), [operations, date]);
  const seed = parseAmount(state.cash) ?? 0;
  const start = useMemo(() => startOfDay(operations, openings, date, seed), [operations, openings, date, seed]);
  const startInput = openings[date] != null ? openings[date] : amountText(start);
  const end = start + dayNet(operations, date);

  const setStart = (value: string) => {
    setState((prev) => {
      const next = { ...(prev.openings ?? {}) };
      if (!value.trim()) delete next[date];
      else next[date] = value;
      return { ...prev, openings: next };
    });
  };

  const addOp = () => {
    setState((prev) => ({ ...prev, operations: [...(prev.operations ?? []), emptyOp("in", date)] }));
  };

  return (
    <div className="earn-calc">
      <section>
        <div className="earn-head">
          <h3>Операции</h3>
          <label className="earn-date-pick">
            Дата
            <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayYmd())} />
          </label>
        </div>
        <div className="wear-scroll">
          <table className="wear-table earn-table">
            <thead>
              <tr>
                <th>Операция</th>
                <th>Сумма</th>
                <th>
                  <button type="button" className="btn ghost sm earn-add" onClick={addOp} aria-label="Добавить операцию">
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="earn-cash">
                <th scope="row">На начало дня</th>
                <td>
                  <input
                    className="earn-money"
                    value={startInput}
                    onChange={(e) => setStart(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="На начало дня"
                  />
                </td>
                <td />
              </tr>
              {dayOps.map((row) => (
                <tr key={row.id} className={row.kind === "out" ? "earn-out" : "earn-in"}>
                  <td>
                    <span className="select-clip">
                      <select
                        className="earn-kind"
                        value={row.kind}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            operations: patchOp(prev.operations ?? [], row.id, { kind: e.target.value as OpKind }),
                          }))
                        }
                        aria-label="Операция"
                      >
                        <option value="in">Получил</option>
                        <option value="out">Потратил</option>
                      </select>
                    </span>
                  </td>
                  <td>
                    <input
                      className="earn-money"
                      value={row.amount}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          operations: patchOp(prev.operations ?? [], row.id, { amount: e.target.value }),
                        }))
                      }
                      inputMode="decimal"
                      placeholder="0"
                      aria-label="Сумма"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          operations: (prev.operations ?? []).filter((op) => op.id !== row.id),
                        }))
                      }
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="earn-total">
                <th scope="row">На конец дня</th>
                <td className={end < 0 ? "earn-neg" : undefined}>{fmtAmount(end)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted earn-hint">Данные остаются на этом компьютере.</p>
      </section>
    </div>
  );
}
