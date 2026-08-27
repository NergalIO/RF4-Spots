import { useEffect, useMemo, useState } from "react";
import { emptyOp, fmtAmount, loadEarnings, parseAmount, saveEarnings, type OpKind } from "../earnings";
import { ALL_WATERBODIES } from "../constants";
import { useStore } from "../store";
import type { FishingSession } from "../types";

const MIGRATED = "rf4spots-earnings-migrated";

type Props = {
  session?: FishingSession | null;
  onSession?: (session: FishingSession) => void;
};

export function EarningsCalc({ session: external, onSession }: Props) {
  const api = useStore((s) => s.api);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const [session, setSession] = useState<FishingSession | null>(external ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (external !== undefined) setSession(external);
  }, [external]);

  useEffect(() => {
    if (external !== undefined) return;
    if (!waterbodyId || waterbodyId === ALL_WATERBODIES) {
      setSession(null);
      return;
    }
    void api
      .sessions({ waterbodyId, active: "1" })
      .then((r) => setSession(r.sessions[0] ?? null))
      .catch((err: Error) => setError(err.message));
  }, [api, waterbodyId, external]);

  function commit(next: FishingSession) {
    setSession(next);
    onSession?.(next);
  }

  async function ensure() {
    if (session && !session.endedAt) return session;
    if (!waterbodyId || waterbodyId === ALL_WATERBODIES) throw new Error("Выберите водоём");
    const { session: created } = await api.startSession(waterbodyId, loadEarnings().cash);
    commit(created);
    return created;
  }

  useEffect(() => {
    if (!session || session.endedAt) return;
    try {
      if (localStorage.getItem(MIGRATED)) return;
      const local = loadEarnings();
      if (!local.operations.length) {
        localStorage.setItem(MIGRATED, "1");
        return;
      }
      if (session.earnings.length) {
        localStorage.setItem(MIGRATED, "1");
        return;
      }
      void (async () => {
        let current = session;
        for (const op of local.operations) {
          const { session: next } = await api.addEarning(current.id, op.kind, op.amount);
          current = next;
        }
        commit(current);
        saveEarnings({ ...local, operations: [] });
        localStorage.setItem(MIGRATED, "1");
      })();
    } catch {
      /* ignore */
    }
  }, [session?.id]);

  const operations = session?.earnings ?? [];
  const start = parseAmount(session?.openingCash ?? "") ?? 0;
  const net = useMemo(() => {
    let received = 0;
    let spent = 0;
    for (const op of operations) {
      const n = parseAmount(op.amount) ?? 0;
      if (op.kind === "in") received += n;
      else spent += n;
    }
    return { received, spent, net: received - spent };
  }, [operations]);

  if (waterbodyId === ALL_WATERBODIES) {
    return <p className="muted earn-hint">Заработок привязан к сессии на конкретном водоёме.</p>;
  }

  return (
    <div className="earn-calc">
      <section>
        <div className="earn-head">
          <h3>Заработок сессии</h3>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="wear-scroll">
          <table className="wear-table earn-table">
            <thead>
              <tr>
                <th>Операция</th>
                <th>Сумма</th>
                <th>
                  <button
                    type="button"
                    className="btn ghost sm earn-add"
                    onClick={() => {
                      void (async () => {
                        const current = await ensure();
                        const { session: next } = await api.addEarning(current.id, emptyOp().kind, "");
                        commit(next);
                      })();
                    }}
                    aria-label="Добавить операцию"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="earn-cash">
                <th scope="row">На начало</th>
                <td>
                  <input
                    className="earn-money"
                    value={session?.openingCash ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSession((prev) => (prev ? { ...prev, openingCash: value } : prev));
                    }}
                    onBlur={() => {
                      if (!session) return;
                      void api.patchSession(session.id, session.openingCash).then((r) => commit(r.session));
                    }}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </td>
                <td />
              </tr>
              {operations.map((row) => (
                <tr key={row.id} className={row.kind === "out" ? "earn-out" : "earn-in"}>
                  <td>
                    <span className="select-clip">
                      <select
                        className="earn-kind"
                        value={row.kind}
                        onChange={(e) => {
                          if (!session) return;
                          void api
                            .patchEarning(session.id, row.id, { kind: e.target.value as OpKind })
                            .then((r) => commit(r.session));
                        }}
                      >
                        <option value="in">Получил</option>
                        <option value="out">Потратил</option>
                      </select>
                    </span>
                  </td>
                  <td>
                    <input
                      className="earn-money"
                      defaultValue={row.amount}
                      onBlur={(e) => {
                        if (!session) return;
                        void api.patchEarning(session.id, row.id, { amount: e.target.value }).then((r) => commit(r.session));
                      }}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => {
                        if (!session) return;
                        void api.deleteEarning(session.id, row.id).then((r) => commit(r.session));
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="earn-total">
                <th scope="row">Итого</th>
                <td className={net.net < 0 ? "earn-neg" : undefined}>{fmtAmount(start + net.net)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted earn-hint">Суммы хранятся на сервере в сессии этого водоёма.</p>
      </section>
    </div>
  );
}
