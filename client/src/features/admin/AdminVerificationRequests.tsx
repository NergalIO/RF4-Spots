import { useState } from "react";
import type { VerificationRequest } from "@/types";
import { fmtDateTime } from "@/shared/format";

type Props = {
  requests: VerificationRequest[];
  busy: boolean;
  onReview: (id: string, status: "approved" | "rejected", adminNote: string) => void;
};

export function AdminVerificationRequests({ requests, busy, onReview }: Props) {
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <section className="admin-panel">
      <div className="earn-head">
        <h3>Запросы на подтверждение профиля</h3>
        {requests.length > 0 && <p className="muted">{requests.length}</p>}
      </div>
      <div className="wear-scroll">
        <table className="wear-table">
          <thead>
            <tr>
              <th>Игрок</th>
              <th>Дата</th>
              <th>Сообщение</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td className="empty" colSpan={4}>
                  Открытых запросов нет
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.user?.nickname ?? "—"}</strong>
                </td>
                <td className="muted">{fmtDateTime(r.createdAt)}</td>
                <td>{r.message || <span className="muted">—</span>}</td>
                <td className="admin-actions">
                  <input
                    className="admin-note-input"
                    placeholder="Заметка"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={busy}
                    onClick={() => onReview(r.id, "approved", notes[r.id] ?? "")}
                  >
                    Одобрить
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={busy}
                    onClick={() => onReview(r.id, "rejected", notes[r.id] ?? "")}
                  >
                    Отклонить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
