import { useEffect, useMemo, useState } from "react";
import { fmtDateTime } from "../api";
import { ALL_WATERBODIES } from "../constants";
import { loadRf4Stat } from "../rf4stat";
import { useStore } from "../store";
import type { StatKind, StatRow, StatsPayload } from "../types";

const PERIODS = [
  { days: 1, label: "1 дн." },
  { days: 7, label: "7 дн." },
  { days: 14, label: "14 дн." },
  { days: 30, label: "30 дн." },
] as const;

type Drill = { bait: string } | { fish: string };
type SortKey = "name" | "catch" | "posts" | "maxWeightG" | "avgWeightG" | "fishSpecies";

function fmtNum(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("ru-RU");
}

function fmtWeight(n: number | null) {
  if (n == null) return "—";
  return `${n.toLocaleString("ru-RU")} г`;
}

function compare(a: StatRow, b: StatRow, key: SortKey, dir: number) {
  if (key === "name") return dir * a.name.localeCompare(b.name, "ru");
  const av = a[key];
  const bv = b[key];
  const an = av == null ? -1 : av;
  const bn = bv == null ? -1 : bv;
  return dir * (an - bn);
}

export function StatsView() {
  const waterbodies = useStore((s) => s.waterbodies);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const setWaterbody = useStore((s) => s.setWaterbody);
  const water = waterbodies.find((w) => w.id === waterbodyId);
  const allWaters = waterbodyId === ALL_WATERBODIES;

  const [days, setDays] = useState(7);
  const [mode, setMode] = useState<StatKind>("baits");
  const [query, setQuery] = useState("");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("catch");
  const [sortDir, setSortDir] = useState<-1 | 1>(-1);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const showingBaits = drill ? "fish" in drill : mode === "baits";

  useEffect(() => {
    setDrill(null);
    setQuery("");
    setSortKey("catch");
    setSortDir(-1);
  }, [waterbodyId, days, mode]);

  useEffect(() => {
    if (allWaters || !waterbodyId || !water) {
      setData(null);
      setError("");
      return;
    }
    const ac = new AbortController();
    setBusy(true);
    setError("");
    void loadRf4Stat({
      kind: showingBaits ? "baits" : "fish",
      waterbodyId,
      waterbody: water.name,
      days,
      bait: drill && "bait" in drill ? drill.bait : undefined,
      fish: drill && "fish" in drill ? drill.fish : undefined,
    })
      .then((payload) => {
        if (!ac.signal.aborted) setData(payload);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Не удалось загрузить статистику");
      })
      .finally(() => {
        if (!ac.signal.aborted) setBusy(false);
      });
    return () => ac.abort();
  }, [allWaters, waterbodyId, water?.name, days, showingBaits, drill]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.rows ?? []).filter((r) => !q || r.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => compare(a, b, sortKey, sortDir));
  }, [data, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === -1 ? 1 : -1));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? 1 : -1);
    }
  }

  async function refresh() {
    if (allWaters || !waterbodyId || !water || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = await loadRf4Stat({
        kind: showingBaits ? "baits" : "fish",
        waterbodyId,
        waterbody: water.name,
        days,
        bait: drill && "bait" in drill ? drill.bait : undefined,
        fish: drill && "fish" in drill ? drill.fish : undefined,
        refresh: true,
      });
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить статистику");
    } finally {
      setBusy(false);
    }
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === -1 ? " ↓" : " ↑";
  }

  if (allWaters) {
    return (
      <div className="stats-page">
        <div className="stats-head">
          <div>
            <h2>Статистика улова</h2>
            <p className="muted">Выберите водоём, чтобы загрузить таблицу RF4-STAT.</p>
          </div>
        </div>
        <div className="stats-waters">
          {waterbodies.map((w) => (
            <button key={w.id} type="button" className="stats-water" onClick={() => void setWaterbody(w.id)}>
              {w.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = drill && "bait" in drill
    ? `Рыба на «${drill.bait}»`
    : drill && "fish" in drill
      ? `Наживки на «${drill.fish}»`
      : mode === "baits"
        ? "Улов на наживки"
        : "Улов по рыбе";

  return (
    <div className="stats-page">
      <div className="stats-head">
        <div>
          <h2>Статистика улова</h2>
          <p className="muted">
            {water?.name ?? "Водоём"} · данные{" "}
            <a href="https://rf4-stat.ru/" target="_blank" rel="noreferrer">
              RF4-STAT
            </a>
            {data?.period ? ` за ${data.period}` : ""}
            {data?.fetchedAt ? ` · ${data.cached ? "кэш" : "свежие"} ${fmtDateTime(data.fetchedAt)}` : ""}
          </p>
        </div>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void refresh()}>
          {busy ? "Загрузка…" : "Обновить"}
        </button>
      </div>

      <div className="stats-toolbar">
        <div className="stats-chips" role="group" aria-label="Период">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              className={`chip-btn ${days === p.days ? "on" : ""}`}
              disabled={busy}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="stats-chips" role="group" aria-label="Группировка">
          <button
            type="button"
            className={`chip-btn ${mode === "baits" ? "on" : ""}`}
            disabled={busy}
            onClick={() => {
              setMode("baits");
              setDrill(null);
            }}
          >
            Наживки
          </button>
          <button
            type="button"
            className={`chip-btn ${mode === "fish" ? "on" : ""}`}
            disabled={busy}
            onClick={() => {
              setMode("fish");
              setDrill(null);
            }}
          >
            Рыба
          </button>
        </div>
        <label className="stats-search">
          Поиск
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={showingBaits ? "Название наживки" : "Название рыбы"}
          />
        </label>
      </div>

      {drill && (
        <div className="stats-crumb">
          <button type="button" className="btn ghost sm" onClick={() => setDrill(null)}>
            ← Назад
          </button>
          <span>
            {title}. Нажмите строку, чтобы перейти к связке рыба ↔ наживка.
          </span>
        </div>
      )}

      {error && <p className="form-error stats-error">{error}</p>}

      <div className="stats-table-wrap">
        {busy && !data ? (
          <p className="empty">Загрузка с RF4-STAT… это может занять несколько секунд.</p>
        ) : rows.length === 0 ? (
          <p className="empty">{query ? "Ничего не найдено по фильтру." : "Нет данных за выбранный период."}</p>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th className="stats-col-name">
                  <button type="button" onClick={() => toggleSort("name")}>
                    {showingBaits ? "Наживка" : "Рыба"}
                    {sortMark("name")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("catch")}>
                    Улов{sortMark("catch")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("posts")}>
                    Посты{sortMark("posts")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("maxWeightG")}>
                    Макс. вес{sortMark("maxWeightG")}
                  </button>
                </th>
                {showingBaits && (
                  <th>
                    <button type="button" onClick={() => toggleSort("avgWeightG")}>
                      Ср. вес{sortMark("avgWeightG")}
                    </button>
                  </th>
                )}
                {showingBaits && (
                  <th>
                    <button type="button" onClick={() => toggleSort("fishSpecies")}>
                      Видов{sortMark("fishSpecies")}
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.name}|${row.icon}|${row.catch}`}
                  onClick={() => setDrill(showingBaits ? { bait: row.name } : { fish: row.name })}
                  title={showingBaits ? "Показать рыбу на этой наживке" : "Показать наживки для этой рыбы"}
                >
                  <td className="stats-col-name">
                    {row.icon ? <img src={row.icon} alt="" width={28} height={28} referrerPolicy="no-referrer" /> : null}
                    <span>{row.name}</span>
                  </td>
                  <td>{fmtNum(row.catch)}</td>
                  <td>{fmtNum(row.posts)}</td>
                  <td>{fmtWeight(row.maxWeightG)}</td>
                  {showingBaits && <td>{fmtWeight(row.avgWeightG)}</td>}
                  {showingBaits && <td>{fmtNum(row.fishSpecies)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="stats-foot muted">
        {rows.length ? `${rows.length} строк` : null}
        {busy && data ? " · обновление…" : null}
        {showingBaits ? " · клик по наживке открывает рыбу" : " · клик по рыбе открывает наживки"}
      </p>
    </div>
  );
}
