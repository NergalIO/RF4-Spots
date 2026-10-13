import { FormEvent, useState } from "react";
import type { Invite } from "../../types";
import { fmtDateTime } from "../../shared/format";

type Props = {
  invites: Invite[];
  busy: boolean;
  copied: string;
  detail: Invite | null;
  detailLoading: boolean;
  onCreate: (e: FormEvent, opts: { expiresAt?: string; maxUses: number }) => void;
  onOpen: (id: string) => void;
  onCloseDetail: () => void;
  onCopy: (code: string) => void;
};

function statusLabel(status: Invite["status"]) {
  if (status === "expired") return "истёк";
  if (status === "exhausted") return "исчерпан";
  return "активен";
}

export function AdminInvites({
  invites,
  busy,
  copied,
  detail,
  detailLoading,
  onCreate,
  onOpen,
  onCloseDetail,
  onCopy,
}: Props) {
  const [maxUses, setMaxUses] = useState("1");
  const [expiresLocal, setExpiresLocal] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const uses = Math.max(1, Number(maxUses) || 1);
    const expiresAt = expiresLocal ? new Date(expiresLocal).toISOString() : undefined;
    onCreate(e, { expiresAt, maxUses: uses });
  }

  if (detail || detailLoading) {
    return (
      <section className="admin-panel">
        <div className="earn-head">
          <h3>Код подтверждения</h3>
          <button type="button" className="btn ghost" onClick={onCloseDetail}>
            К списку
          </button>
        </div>
        {detailLoading && <p className="muted">Загрузка…</p>}
        {detail && (
          <>
            <div className="invite-detail">
              <p>
                <button type="button" className="invite-code" onClick={() => onCopy(detail.code)}>
                  {detail.code}
                  {copied === detail.code ? " · скопирован" : ""}
                </button>
              </p>
              <p className="muted">
                Создал: {detail.createdBy.nickname} · {fmtDateTime(detail.createdAt)}
              </p>
              <p className="muted">Срок: {detail.expiresAt ? fmtDateTime(detail.expiresAt) : "без срока"}</p>
              <p className="muted">
                Использований: {detail.usesCount} / {detail.maxUses}
              </p>
              <p>
                <span className={`status-pill ${detail.status === "active" ? "on" : "off"}`}>
                  {statusLabel(detail.status)}
                </span>
              </p>
              <button type="button" className="btn ghost" onClick={() => onCopy(detail.code)}>
                Копировать код
              </button>
            </div>
            <h4>Погашения</h4>
            <div className="wear-scroll">
              <table className="wear-table">
                <thead>
                  <tr>
                    <th>Игрок</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.redemptions?.length ?? 0) === 0 && (
                    <tr>
                      <td className="empty" colSpan={2}>
                        Пока никто не использовал
                      </td>
                    </tr>
                  )}
                  {detail.redemptions?.map((r) => (
                    <tr key={`${r.nickname}-${r.createdAt}`}>
                      <td>{r.nickname}</td>
                      <td className="muted">{fmtDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="earn-head">
        <h3>Коды подтверждения</h3>
        <form className="invite-create" onSubmit={submit}>
          <label>
            Срок
            <input type="datetime-local" value={expiresLocal} onChange={(e) => setExpiresLocal(e.target.value)} />
          </label>
          <label>
            Использований
            <input
              type="number"
              min={1}
              max={10000}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              required
            />
          </label>
          <button className="btn primary" disabled={busy} type="submit">
            Выдать код
          </button>
        </form>
      </div>
      <p className="muted earn-hint">Нажмите на код, чтобы открыть детализацию. Пустой срок — бессрочно.</p>
      <div className="wear-scroll">
        <table className="wear-table">
          <thead>
            <tr>
              <th>Код</th>
              <th>Срок</th>
              <th>Исп.</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 && (
              <tr>
                <td className="empty" colSpan={4}>
                  Кодов пока нет
                </td>
              </tr>
            )}
            {invites.map((i) => (
              <tr key={i.id} className="clickable-row" onClick={() => onOpen(i.id)}>
                <td>
                  <button type="button" className="invite-code">
                    {i.code}
                  </button>
                </td>
                <td className="muted">{i.expiresAt ? fmtDateTime(i.expiresAt) : "—"}</td>
                <td>
                  {i.usesCount}/{i.maxUses}
                </td>
                <td>
                  <span className={`status-pill ${i.status === "active" ? "on" : "off"}`}>{statusLabel(i.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
