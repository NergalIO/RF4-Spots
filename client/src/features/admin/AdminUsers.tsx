import type { AdminUser } from "../../types";
import { fmtDateTime, fmtWhen } from "../../shared/format";

type Props = {
  users: AdminUser[];
  meId?: string;
  busy: boolean;
  menuUserId?: string;
  onOpenMenu: (user: AdminUser, x: number, y: number) => void;
};

export function AdminUsers({ users, meId, busy, menuUserId, onOpenMenu }: Props) {
  return (
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
                  if (u.id === meId) return;
                  e.preventDefault();
                  onOpenMenu(u, e.clientX, e.clientY);
                }}
              >
                <td>
                  <strong>{u.nickname}</strong>
                  {u.id === meId && <span className="muted"> · вы</span>}
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
                    <span className="muted" title={fmtDateTime(u.lastActiveAt)}>
                      {fmtWhen(u.lastActiveAt)}
                    </span>
                  )}
                </td>
                <td className="admin-actions">
                  {u.id !== meId && (
                    <button
                      type="button"
                      className="btn ghost sm admin-kebab"
                      disabled={busy}
                      aria-haspopup="menu"
                      aria-expanded={menuUserId === u.id}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        onOpenMenu(u, r.right - 200, r.bottom + 4);
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
  );
}
