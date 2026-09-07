import { FormEvent } from "react";

export function ReportForm({
  reason,
  busy,
  onReason,
  onCancel,
  onSubmit,
}: {
  reason: string;
  busy: boolean;
  onReason: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form className="comment-form" onSubmit={onSubmit}>
      <textarea rows={3} placeholder="Почему жалоба" value={reason} onChange={(e) => onReason(e.target.value)} />
      <div className="row-actions">
        <button type="button" className="btn ghost sm" onClick={onCancel}>
          Отмена
        </button>
        <button className="btn danger sm" disabled={busy || reason.trim().length < 3} type="submit">
          Отправить жалобу
        </button>
      </div>
    </form>
  );
}
