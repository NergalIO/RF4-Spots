import { FormEvent, useEffect, useState } from "react";
import { useStore } from "../store";
import type { AdminUser, Invite, ModerationReport } from "../types";

export function AdminView() {
  const api = useStore((s) => s.api);
  const me = useStore((s) => s.user);
  const [tab, setTab] = useState<"users" | "invites" | "reports">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    setError("");
    try {
      const [u, i, r] = await Promise.all([api.adminUsers(), api.adminInvites(), api.adminReports("open")]);
      setUsers(u.users);
      setInvites(i.invites);
      setReports(r.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }

  useEffect(() => {
    void reload();
  }, [api]);

  async function patchUser(id: string, body: { role?: "player" | "admin"; disabled?: boolean }) {
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

  return (
    <div className="admin-view">
      <div className="tools-tabs" role="tablist">
        <button type="button" className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>
          Игроки
        </button>
        <button type="button" className={tab === "invites" ? "on" : ""} onClick={() => setTab("invites")}>
          Приглашения
        </button>
        <button type="button" className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>
          Жалобы{reports.length ? ` (${reports.length})` : ""}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {tab === "users" && (
        <table className="wear-table">
          <thead>
            <tr>
              <th>Ник</th>
              <th>Роль</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.nickname}</td>
                <td>{u.role === "admin" ? "админ" : "игрок"}</td>
                <td>{u.disabledAt ? "отключён" : "активен"}</td>
                <td className="admin-actions">
                  {u.role !== "admin" && (
                    <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void patchUser(u.id, { role: "admin" })}>
                      Сделать админом
                    </button>
                  )}
                  {u.role === "admin" && u.id !== me?.id && (
                    <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void patchUser(u.id, { role: "player" })}>
                      Снять админа
                    </button>
                  )}
                  {u.id !== me?.id && !u.disabledAt && (
                    <button type="button" className="btn danger sm" disabled={busy} onClick={() => void patchUser(u.id, { disabled: true })}>
                      Отключить
                    </button>
                  )}
                  {u.disabledAt && (
                    <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void patchUser(u.id, { disabled: false })}>
                      Включить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "invites" && (
        <div>
          <form onSubmit={(e) => void createInvite(e)} className="row-actions">
            <button className="btn primary" disabled={busy} type="submit">
              Выдать код
            </button>
          </form>
          <table className="wear-table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Создан</th>
                <th>Использован</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td>
                    <code>{i.code}</code>
                  </td>
                  <td>{new Date(i.createdAt).toLocaleString("ru-RU")}</td>
                  <td>{i.usedBy ? i.usedBy.nickname : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "reports" && (
        <div className="report-list">
          {reports.length === 0 && <p className="empty">Открытых жалоб нет</p>}
          {reports.map((r) => (
            <article key={r.id} className="comment">
              <header>
                <strong>{r.reporter.nickname}</strong>
                <time>{new Date(r.createdAt).toLocaleString("ru-RU")}</time>
              </header>
              <p>{r.reason}</p>
              <p className="muted">
                {r.post
                  ? `Пост: ${r.post.fishName}${r.post.deleted ? " (скрыт)" : ""}`
                  : r.comment
                    ? `Комментарий${r.comment.deleted ? " (скрыт)" : ""}`
                    : ""}
              </p>
              <div className="row-actions">
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
    </div>
  );
}
