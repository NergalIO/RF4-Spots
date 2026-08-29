import { FormEvent } from "react";
import type { Invite } from "../../types";
import { fmtDateTime } from "../../shared/format";

type Props = {
  invites: Invite[];
  busy: boolean;
  copied: string;
  onCreate: (e: FormEvent) => void;
  onCopy: (code: string) => void;
};

export function AdminInvites({ invites, busy, copied, onCreate, onCopy }: Props) {
  return (
    <section className="admin-panel">
      <div className="earn-head">
        <h3>Приглашения</h3>
        <form onSubmit={onCreate}>
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
                  <button type="button" className="invite-code" onClick={() => onCopy(i.code)} title="Копировать код">
                    {i.code}
                    {copied === i.code ? " · скопирован" : ""}
                  </button>
                </td>
                <td className="muted">{fmtDateTime(i.createdAt)}</td>
                <td>
                  {i.usedAt ? (
                    i.usedBy ? (
                      i.usedBy.nickname
                    ) : (
                      <span title={fmtDateTime(i.usedAt)}>
                        игрок удалён
                        <span className="muted"> · {fmtDateTime(i.usedAt)}</span>
                      </span>
                    )
                  ) : (
                    <span className="status-pill unused">не использован</span>
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
