import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fmtDateTime } from "../api";
import { useStore } from "../store";
import type { AdminStats, AdminUser, Invite, ModerationReport } from "../types";
import { AdminDashboard } from "./AdminDashboard";

const TAB_KEY = "rf4spots-admin-tab";
type AdminTab = "dashboard" | "users" | "invites" | "reports";

function loadTab(): AdminTab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (v === "dashboard" || v === "users" || v === "invites" || v === "reports") return v;
  } catch {
    /* ignore */
  }
  return "dashboard";
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* ignore */
  }
}

type UserMenu = { user: AdminUser; top: number; left: number };

export function AdminView() {
  const api = useStore((s) => s.api);
  const me = useStore((s) => s.user);
  const [tab, setTab] = useState<AdminTab>(loadTab);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [menu, setMenu] = useState<UserMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function reload() {
    setError("");
    try {
      const [u, i, r, s] = await Promise.all([
        api.adminUsers(),
        api.adminInvites(),
        api.adminReports("open"),
        api.adminStats(),
      ]);
      setUsers(u.users);
      setInvites(i.invites);
      setReports(r.reports);
      setStats(s.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }

  useEffect(() => {
    void reload();
  }, [api]);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function openMenu(user: AdminUser, x: number, y: number) {
    const width = 200;
    const left = Math.min(x, window.innerWidth - width - 8);
    const top = Math.min(y, window.innerHeight - 220);
    setMenu({ user, top, left: Math.max(8, left) });
  }

  async function patchUser(id: string, body: { role?: "player" | "admin"; disabled?: boolean }) {
    setMenu(null);
    setBusy(true);
    try {
      await api.adminPatchUser(id, body);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string, nickname: string) {
    setMenu(null);
    if (!window.confirm(`Удалить игрока «${nickname}» и все его посты?`)) return;
    setBusy(true);
    try {
      await api.adminDeleteUser(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  }

  async function createInvite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { invite } = await api.adminCreateInvite();
      setInvites((prev) => [invite, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать приглашение");
    } finally {
      setBusy(false);
    }
  }

  async function resolveReport(id: string, hide: boolean) {
    setBusy(true);
    try {
      await api.adminPatchReport(id, { status: "resolved", hide });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обработать жалобу");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code: string) {
    await copyText(code);
    setCopied(code);
    window.setTimeout(() => setCopied((cur) => (cur === code ? "" : cur)), 1600);
  }

  const menuUser = menu?.user;


  return (
    <div className="tools-host">
      <nav className="tools-nav" aria-label="Админка">
        <button type="button" className={tab === "dashboard" ? "on" : ""} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button type="button" className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>
          Игроки
        </button>
        <button type="button" className={tab === "invites" ? "on" : ""} onClick={() => setTab("invites")}>
          Приглашения
        </button>
        <button type="button" className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>
          Жалобы{reports.length ? ` (${reports.length})` : ""}
        </button>
      </nav>
      <div className="tools-body">
        {error && <p className="form-error">{error}</p>}
        {tab === "dashboard" && <AdminDashboard stats={stats} />}
        {tab === "users" && (
          <section className="admin-panel">
            <div className="earn-head">
              <h3>Игроки</h3>
              {users.length > 0 && <p className="muted">{users.length}</p>}
            </div>
            <div className="wear-scroll">
              <table className="wear-table">
                <thead>
                  <tr>
                    <th>Ник</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Активность</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td className="empty" colSpan={5}>
                        Игроков пока нет
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={u.disabledAt ? "is-off" : undefined}
                      onContextMenu={(e) => {
                        if (u.id === me?.id) return;
                        e.preventDefault();
                        openMenu(u, e.clientX, e.clientY);
                      }}
                    >
                      <td>
                        <strong>{u.nickname}</strong>
                        {u.id === me?.id && <span className="muted"> · вы</span>}
                      </td>
                      <td>
                        <span className={`status-pill ${u.role === "admin" ? "admin" : ""}`}>
                          {u.role === "admin" ? "админ" : "игрок"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.disabledAt ? "off" : "on"}`}>{u.disabledAt ? "отключён" : "включён"}</span>
                      </td>
                      <td>
                        {u.online && !u.disabledAt ? (
                          <span className="status-pill live">Активен</span>
                        ) : (
                          <span className="muted">{fmtDateTime(u.lastActiveAt)}</span>
                        )}
                      </td>
                      <td className="admin-actions">
                        {u.id !== me?.id && (
                          <button
                            type="button"
                            className="btn ghost sm admin-kebab"
                            disabled={busy}
                            aria-haspopup="menu"
                            aria-expanded={menuUser?.id === u.id}
                            onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              openMenu(u, r.right - 200, r.bottom + 4);
                            }}
                          >
                            ⋮
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {tab === "invites" && (
          <section className="admin-panel">
            <div className="earn-head">
              <h3>Приглашения</h3>
              <form onSubmit={(e) => void createInvite(e)}>
                <button className="btn primary" disabled={busy} type="submit">
                  Выдать код
                </button>
              </form>
            </div>
            <p className="muted earn-hint">Нажмите на код, чтобы скопировать.</p>
            <div className="wear-scroll">
              <table className="wear-table">
                <thead>
                  <tr>
                    <th>Код</th>
                    <th>Создан</th>
                    <th>Использован</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 && (
                    <tr>
                      <td className="empty" colSpan={3}>
                        Кодов пока нет
                      </td>
                    </tr>
                  )}
                  {invites.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button type="button" className="invite-code" onClick={() => void copyCode(i.code)} title="Копировать код">
                          {i.code}
                          {copied === i.code ? " · скопирован" : ""}
                        </button>
                      </td>
                      <td className="muted">{fmtDateTime(i.createdAt)}</td>
                      <td>
                        {i.usedBy ? i.usedBy.nickname : <span className="status-pill unused">не использован</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {tab === "reports" && (
          <section className="admin-panel">
            <div className="earn-head">
              <h3>Жалобы</h3>
              {reports.length > 0 && <p className="muted">открытых: {reports.length}</p>}
            </div>
            {reports.length === 0 ? (
              <p className="empty">Открытых жалоб нет</p>
            ) : (
              <div className="report-list">
                {reports.map((r) => (
                  <article key={r.id} className="admin-report">
                    <header>
                      <strong>{r.reporter.nickname}</strong>
                      <time className="muted">{fmtDateTime(r.createdAt)}</time>
                    </header>
                    <p>{r.reason}</p>
                    <p className="muted">
                      {r.post
                        ? `Пост: ${r.post.fishName}${r.post.deleted ? " (скрыт)" : ""}`
                        : r.comment
                          ? `Комментарий${r.comment.deleted ? " (скрыт)" : ""}`
                          : ""}
                    </p>
                    <div className="admin-actions">
                      <button type="button" className="btn danger sm" disabled={busy} onClick={() => void resolveReport(r.id, true)}>
                        Скрыть и закрыть
                      </button>
                      <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void resolveReport(r.id, false)}>
                        Закрыть без скрытия
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="user-menu-list admin-ctx"
            role="menu"
            style={{ top: menu.top, left: menu.left }}
          >
            {menu.user.role !== "admin" && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { role: "admin" })}>
                Сделать админом
              </button>
            )}
            {menu.user.role === "admin" && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { role: "player" })}>
                Снять админа
              </button>
            )}
            {!menu.user.disabledAt && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { disabled: true })}>
                Отключить
              </button>
            )}
            {menu.user.disabledAt && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { disabled: false })}>
                Включить
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="danger"
              disabled={busy}
              onClick={() => void deleteUser(menu.user.id, menu.user.nickname)}
            >
              Удалить
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
