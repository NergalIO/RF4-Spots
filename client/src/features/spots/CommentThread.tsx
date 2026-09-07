import { fmtWhen } from "@/shared/format";
import type { CommentItem, Screenshot, User } from "@/types";

export function CommentThread({
  comments,
  user,
  fileUrl,
  onDelete,
  onReport,
  onOpenShots,
}: {
  comments: CommentItem[] | undefined;
  user: User | null | undefined;
  fileUrl: (url: string) => string;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onOpenShots: (shots: Screenshot[], index: number) => void;
}) {
  return (
    <section className="thread">
      <h4>Комментарии</h4>
      {comments?.length === 0 && <p className="empty">Пока тихо — напишите первым</p>}
      {comments?.map((c) => (
        <article key={c.id} className="comment">
          <header>
            <strong>{c.author.nickname}</strong>
            <time title={c.createdAt}>{fmtWhen(c.createdAt)}</time>
            {(user?.role === "admin" || user?.id === c.author.id) && (
              <button type="button" className="linkish" onClick={() => onDelete(c.id)}>
                удалить
              </button>
            )}
            {user && user.id !== c.author.id && (
              <button type="button" className="linkish" onClick={() => onReport(c.id)}>
                жалоба
              </button>
            )}
          </header>
          <p>{c.text}</p>
          {c.screenshots.length > 0 && (
            <div className="thumbs sm">
              {c.screenshots.map((s, i) => (
                <button key={s.id} type="button" onClick={() => onOpenShots(c.screenshots, i)}>
                  <img src={fileUrl(s.url)} alt="" />
                </button>
              ))}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
