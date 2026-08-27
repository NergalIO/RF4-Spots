import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATCH_LABEL } from "../api";
import { ALL_WATERBODIES } from "../constants";
import { useStore } from "../store";
import type { CatchType, FishingSession } from "../types";
import { catchDedupeKey, parseCatch } from "../ocr/parseCatch";
import { EarningsCalc } from "./EarningsCalc";
import { loadEarnings } from "../earnings";

const OCR_KEY = "rf4spots-ocr-on";

export function SessionView({ active }: { active: boolean }) {
  const api = useStore((s) => s.api);
  const fish = useStore((s) => s.fish);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const waterbodies = useStore((s) => s.waterbodies);
  const electron = typeof window !== "undefined" && Boolean(window.rf4?.ocrCapture);
  const [session, setSession] = useState<FishingSession | null>(null);
  const [ocrOn, setOcrOn] = useState(() => {
    try {
      return localStorage.getItem(OCR_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [cafeNames, setCafeNames] = useState<string[]>([]);
  const lastKey = useRef("");
  const workerRef = useRef<import("tesseract.js").Worker | null>(null);

  const wbName = waterbodies.find((w) => w.id === waterbodyId)?.name ?? "";
  const cafeSet = useMemo(() => new Set(cafeNames.map((n) => n.toLowerCase())), [cafeNames]);

  const loadSession = useCallback(async () => {
    if (!waterbodyId || waterbodyId === ALL_WATERBODIES) {
      setSession(null);
      return;
    }
    const { sessions } = await api.sessions({ waterbodyId, active: "1" });
    setSession(sessions[0] ?? null);
  }, [api, waterbodyId]);

  useEffect(() => {
    if (!active) return;
    void loadSession().catch((err: Error) => setError(err.message));
  }, [active, loadSession]);

  useEffect(() => {
    if (!active || !waterbodyId || waterbodyId === ALL_WATERBODIES) {
      setCafeNames([]);
      return;
    }
    void api
      .cafeOrders(waterbodyId)
      .then((r) => setCafeNames(r.names))
      .catch(() => setCafeNames([]));
  }, [active, api, waterbodyId]);

  useEffect(() => {
    try {
      localStorage.setItem(OCR_KEY, ocrOn ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [ocrOn]);

  async function ensureSession() {
    if (session && !session.endedAt) return session;
    if (!waterbodyId || waterbodyId === ALL_WATERBODIES) throw new Error("Выберите водоём");
    const opening = loadEarnings().cash;
    const { session: created } = await api.startSession(waterbodyId, opening);
    setSession(created);
    return created;
  }

  async function addParsed(text: string) {
    const parsed = parseCatch(text, fish);
    if (!parsed.fishName && parsed.weightKg == null) return;
    const key = catchDedupeKey(parsed);
    if (!key || key === "|" || key === lastKey.current) return;
    lastKey.current = key;
    const current = await ensureSession();
    const { session: next } = await api.addCatch(current.id, {
      fishId: parsed.fishId,
      fishNameRaw: parsed.fishName || "Не распознано",
      weightKg: parsed.weightKg,
      catchType: parsed.catchType,
      ocrText: text.slice(0, 4000),
    });
    setSession(next);
  }

  useEffect(() => {
    if (!active || !ocrOn || !electron) return;
    let dead = false;
    const tick = async () => {
      if (dead || document.hidden) return;
      try {
        const shot = await window.rf4!.ocrCapture!();
        if (!shot.ok || !shot.dataUrl) {
          setStatus(shot.error || "Окно игры не найдено");
          return;
        }
        if (!workerRef.current) {
          const { createWorker } = await import("tesseract.js");
          const langPath = (await window.rf4?.tessLangPath?.()) || undefined;
          const worker = await createWorker("rus+eng", 1, langPath ? { langPath } : undefined);
          workerRef.current = worker;
        }
        const worker = workerRef.current;
        if (!worker) return;
        const result = await worker.recognize(shot.dataUrl);
        const text = result.data.text || "";
        setStatus("Распознавание включено");
        await addParsed(text);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Ошибка OCR");
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 1800);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [active, ocrOn, electron, fish, waterbodyId]);

  useEffect(() => {
    return () => {
      void workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  async function start() {
    setError("");
    try {
      await ensureSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось начать сессию");
    }
  }

  async function end() {
    if (!session) return;
    const { session: next } = await api.endSession(session.id);
    setSession(next);
    setOcrOn(false);
  }

  async function patchCatch(id: string, fishId: string, catchType: string, weight: string) {
    if (!session) return;
    const { session: next } = await api.updateCatch(session.id, id, {
      fishId: fishId || null,
      catchType: (catchType || null) as CatchType | null,
      weightKg: weight ? Number(weight.replace(",", ".")) : null,
    });
    setSession(next);
  }

  if (waterbodyId === ALL_WATERBODIES) {
    return <p className="empty">Выберите водоём, чтобы вести сессию улова и заработок.</p>;
  }

  return (
    <div className="session-view">
      <header className="session-head">
        <div>
          <h2>Сессия · {wbName}</h2>
          <p className="muted">{session && !session.endedAt ? "идёт" : "нет активной сессии"}</p>
        </div>
        <div className="row-actions">
          {(!session || session.endedAt) && (
            <button type="button" className="btn primary" onClick={() => void start()}>
              Начать сессию
            </button>
          )}
          {session && !session.endedAt && (
            <button type="button" className="btn ghost" onClick={() => void end()}>
              Завершить
            </button>
          )}
        </div>
      </header>
      {error && <p className="form-error">{error}</p>}
      <label className="chip">
        <input type="checkbox" checked={ocrOn} disabled={!electron} onChange={(e) => setOcrOn(e.target.checked)} />
        Распознавание окна игры
      </label>
      {!electron && <p className="muted">Автозахват окна RF4 работает только в приложении Windows.</p>}
      {electron && <p className="muted">{ocrOn ? status || "Ищем окно Russian Fishing 4…" : "Захват выключен"}</p>}
      <section>
        <h3>Улов</h3>
        {!session?.catches.length && <p className="empty">Пока пусто — включите OCR или добавьте вручную после поимки.</p>}
        <ul className="catch-list">
          {session?.catches.map((c) => {
            const cafe = cafeSet.has(c.fishName.toLowerCase()) || cafeSet.has(c.fishNameRaw.toLowerCase());
            return (
              <li key={c.id} className="catch-row">
                <div>
                  <strong>{c.fishName}</strong>
                  {cafe && <span className="cafe-badge">заказ кафе</span>}
                  <span className="meta">
                    {c.weightKg != null ? `${c.weightKg} кг` : "вес ?"}
                    {c.catchType ? ` · ${CATCH_LABEL[c.catchType]}` : ""}
                  </span>
                </div>
                <div className="catch-edit">
                  <select
                    value={c.fishId ?? ""}
                    onChange={(e) => void patchCatch(c.id, e.target.value, c.catchType ?? "", c.weightKg != null ? String(c.weightKg) : "")}
                  >
                    <option value="">не из справочника</option>
                    {fish.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn danger sm"
                    onClick={() => session && void api.deleteCatch(session.id, c.id).then((r) => setSession(r.session))}
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <EarningsCalc session={session} onSession={setSession} />
    </div>
  );
}
