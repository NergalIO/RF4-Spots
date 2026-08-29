import { FormEvent, useEffect, useState } from "react";
import { Api, ApiError } from "@/api";
import { DEFAULT_SERVER_URL, loadSession } from "@/session";
import { isServerUrlPinned, resolveServerUrl } from "@/serverUrl";
import { useStore } from "@/store";

export function AuthScreen() {
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [allowRegister, setAllowRegister] = useState(true);
  const [invites, setInvites] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pinned = isServerUrlPinned();
  const canRegister = allowRegister || invites;

  useEffect(() => {
    loadSession().then((s) => setServerUrl(s.serverUrl));
  }, []);

  useEffect(() => {
    let dead = false;
    try {
      const url = resolveServerUrl(serverUrl);
      const api = new Api(url, "");
      void api
        .authConfig()
        .then((cfg) => {
          if (dead) return;
          setAllowRegister(cfg.allowRegister);
          setInvites(Boolean(cfg.invites));
          if (!cfg.allowRegister && !cfg.invites) setMode((m) => (m === "register" ? "login" : m));
        })
        .catch(() => {
          if (!dead) {
            setAllowRegister(true);
            setInvites(false);
          }
        });
    } catch {
      /* invalid url while typing */
    }
    return () => {
      dead = true;
    };
  }, [serverUrl]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const url = resolveServerUrl(serverUrl);
      if (mode === "login") await login(nickname, password, url);
      else await register(nickname, password, url, invite);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Не удалось связаться с сервером");
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
          {canRegister && (
            <button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>
              Регистрация
            </button>
          )}
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
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </label>
          {mode === "register" && invites && !allowRegister && (
            <label>
              Код приглашения
              <input value={invite} onChange={(e) => setInvite(e.target.value)} required autoComplete="off" />
            </label>
          )}
          {pinned ? (
            <p className="hint">Сервер: {serverUrl}</p>
          ) : (
            <label>
              Адрес сервера
              <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary" disabled={busy} type="submit">
            {busy ? "…" : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>
        <p className="hint">
          {mode === "register"
            ? invites && !allowRegister
              ? "Регистрация по коду, который выдаёт администратор."
              : "Регистрация создаёт игрока. Админа назначают в приложении."
            : canRegister
              ? "При следующих запусках вход будет автоматическим."
              : "Регистрация закрыта. Аккаунт выдаёт администратор."}
        </p>
      </div>
    </div>
  );
}
