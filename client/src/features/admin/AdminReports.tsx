import type { ModerationReport } from "@/types";
import { fmtDateTime } from "@/shared/format";
import { reportCaption, reportPostId } from "./reportTarget";

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatusFilter = (typeof REPORT_STATUSES)[number];

const STATUS_LABEL: Record<ReportStatusFilter, string> = {
  open: "открытые",
  resolved: "разобранные",
  dismissed: "отклонённые",
};

const EMPTY: Record<ReportStatusFilter, string> = {
  open: "Открытых жалоб нет",
  resolved: "Разобранных жалоб нет",
  dismissed: "Отклонённых жалоб нет",
};

const CLOSED_LABEL: Record<"resolved" | "dismissed", string> = {
  resolved: "разобрана",
  dismissed: "отклонена",
};

type Props = {
  status: ReportStatusFilter;
  onStatus: (status: ReportStatusFilter) => void;
  reports: ModerationReport[];
  busy: boolean;
  onResolve: (id: string, hide: boolean) => void;
  onReopen: (id: string) => void;
  onOpenPost?: (postId: string) => void;
};

export function AdminReports({ status, onStatus, reports, busy, onResolve, onReopen, onOpenPost }: Props) {
  return (
    <section className="admin-panel">
      <div className="earn-head">
        <h3>Жалобы</h3>
        <div className="reports-seg" role="tablist" aria-label="Статус жалоб">
          {REPORT_STATUSES.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={status === id ? "on" : ""}
              aria-selected={status === id}
              onClick={() => onStatus(id)}
            >
              {STATUS_LABEL[id]}
            </button>
          ))}
        </div>
      </div>
      {reports.length === 0 ? (
        <p className="empty">{EMPTY[status]}</p>
      ) : (
        <div className="report-list">
          {reports.map((r) => {
            const postId = reportPostId(r);
            return (
              <article key={r.id} className="admin-report">
                <header>
                  <strong>{r.reporter.nickname}</strong>
                  <time className="muted">{fmtDateTime(r.createdAt)}</time>
                  {r.status !== "open" && <span className="status-pill">{CLOSED_LABEL[r.status]}</span>}
                </header>
                <p>{r.reason}</p>
                <p className="muted">{reportCaption(r)}</p>
                {r.status !== "open" && (
                  <p className="muted">
                    {r.resolvedBy ? r.resolvedBy.nickname : "админ"}
                    {r.resolvedAt ? ` · ${fmtDateTime(r.resolvedAt)}` : ""}
                  </p>
                )}
                <div className="admin-actions">
                  {postId && onOpenPost && (
                    <button type="button" className="btn ghost sm" disabled={busy} onClick={() => onOpenPost(postId)}>
                      Открыть пост
                    </button>
                  )}
                  {r.status === "open" ? (
                    <>
                      <button type="button" className="btn danger sm" disabled={busy} onClick={() => onResolve(r.id, true)}>
                        Скрыть и закрыть
                      </button>
                      <button type="button" className="btn ghost sm" disabled={busy} onClick={() => onResolve(r.id, false)}>
                        Закрыть без скрытия
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn ghost sm" disabled={busy} onClick={() => onReopen(r.id)}>
                      Вернуть в открытые
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
