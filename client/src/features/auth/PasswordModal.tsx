import { FormEvent, useState } from "react";
import { useStore } from "@/store";

export function PasswordModal({ onClose }: { onClose: () => void }) {
  const api = useStore((s) => s.api);
  const setToken = useStore((s) => s.setToken);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.changePassword(current, next);
      await setToken(res.token, res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сменить пароль");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2>Смена пароля</h2>
        <label>
          Текущий пароль
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </label>
        <label>
          Новый пароль
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required autoComplete="new-password" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" disabled={busy} type="submit">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
