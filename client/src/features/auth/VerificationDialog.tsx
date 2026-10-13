import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/api";
import { useStore } from "@/store";
import type { VerificationRequest } from "@/types";
import { fmtDateTime } from "@/shared/format";

type Mode = "form" | "requests";

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
};

export function VerificationDialog({ open, onClose, initialMode = "form" }: Props) {
  const api = useStore((s) => s.api);
  const setToken = useStore((s) => s.setToken);
  const user = useStore((s) => s.user);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError("");
    setInfo("");
  }, [open, initialMode]);

  useEffect(() => {
    if (!open || mode !== "requests") return;
    let dead = false;
    void api.auth
      .verificationRequests()
      .then((res) => {
        if (!dead) setRequests(res.requests);
      })
      .catch((err) => {
        if (!dead) setError(err instanceof Error ? err.message : "Не удалось загрузить запросы");
      });
    return () => {
      dead = true;
    };
  }, [open, mode, api]);

  if (!open || !user) return null;

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await api.auth.verifyCode(code);
      await setToken(res.token, res.user);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onRequest() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api.auth.createVerificationRequest(message);
      setInfo("Запрос отправлен администраторам");
      setMode("requests");
      const res = await api.auth.verificationRequests();
      setRequests(res.requests);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = (s: VerificationRequest["status"]) =>
    s === "pending" ? "ожидает" : s === "approved" ? "одобрен" : "отклонён";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal verification-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{mode === "requests" ? "Мои запросы" : "Подтверждение профиля"}</h3>
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {user.verified ? (
          <p className="muted">Профиль уже подтверждён.</p>
        ) : mode === "form" ? (
          <>
            <p className="muted">Введите код подтверждения или отправьте запрос администраторам.</p>
            <form onSubmit={onVerify} className="verification-form">
              <label>
                Код подтверждения
                <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" required />
              </label>
              <button className="btn primary" disabled={busy} type="submit">
                Подтвердить код
              </button>
            </form>
            <label>
              Сообщение админам (необязательно)
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={500} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn ghost" disabled={busy} onClick={() => void onRequest()}>
                Отправить запрос
              </button>
              <button type="button" className="btn ghost" onClick={() => setMode("requests")}>
                Мои запросы
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setMode("form")}>
                Назад
              </button>
            </div>
            {requests.length === 0 ? (
              <p className="muted">Запросов пока нет</p>
            ) : (
              <ul className="verification-request-list">
                {requests.map((r) => (
                  <li key={r.id}>
                    <strong>{statusLabel(r.status)}</strong>
                    <span className="muted"> · {fmtDateTime(r.createdAt)}</span>
                    {r.adminNote ? <p className="muted">{r.adminNote}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        {info && <p className="hint">{info}</p>}
      </div>
    </div>
  );
}
