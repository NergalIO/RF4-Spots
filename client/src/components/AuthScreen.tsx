import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../api";
import { DEFAULT_SERVER_URL, loadSession } from "../session";
import { useStore } from "../store";

export function AuthScreen() {
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSession().then((s) => setServerUrl(s.serverUrl));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(nickname, password, serverUrl);
      else await register(nickname, password, serverUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось связаться с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="eyebrow">Russian Fishing 4</p>
        <h1>Точки ловли</h1>
        <p className="lead">Общая карта спотов: координаты, уловы и скриншоты с водоёмов.</p>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>
            Вход
          </button>
          <button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>
            Регистрация
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <label>
            Никнейм
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" required />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          <label>
            Адрес сервера
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary" disabled={busy} type="submit">
            {busy ? "…" : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>
        <p className="hint">
          {mode === "register"
            ? "Регистрация создаёт игрока. Админа назначают командой на сервере."
            : "При следующих запусках вход будет автоматическим."}
        </p>
      </div>
    </div>
  );
}
