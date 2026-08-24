import { FormEvent, useState } from "react";
import { CATCH_LABEL, fmtCoord, fmtDate, fmtDateTime } from "../api";
import { useStore } from "../store";
import type { Screenshot } from "../types";

type Props = {
  onEdit: () => void;
  onOpenShots: (shots: Screenshot[], index: number) => void;
};

export function PostDetail({ onEdit, onOpenShots }: Props) {
  const detail = useStore((s) => s.detail);
  const user = useStore((s) => s.user);
  const api = useStore((s) => s.api);
  const selectPost = useStore((s) => s.selectPost);
  const refreshPosts = useStore((s) => s.refreshPosts);
  const refreshDetail = useStore((s) => s.refreshDetail);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!detail) {
    return (
      <aside className="panel right">
        <div className="panel-head">
          <h2>Детали</h2>
        </div>
        <p className="empty">Выберите пост слева или точку на карте</p>
      </aside>
    );
  }

  const post = detail;
  const canMod = user?.role === "admin" || user?.id === post.author.id;

  async function removePost() {
    if (!confirm("Удалить этот пост?")) return;
    await api.deletePost(post.id);
    await selectPost(null);
    await refreshPosts();
  }

  async function sendComment(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("text", text.trim());
    for (const f of files) fd.append("screenshots", f);
    try {
      await api.addComment(post.id, fd);
      setText("");
      setFiles([]);
      setFileKey((k) => k + 1);
      await refreshDetail();
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="panel right">
      <div className="panel-head">
        <h2>Детали</h2>
        {canMod && (
          <div className="head-actions">
            <button type="button" className="btn ghost sm" onClick={onEdit}>
              Изменить
            </button>
            <button type="button" className="btn danger sm" onClick={() => void removePost()}>
              Удалить
            </button>
          </div>
        )}
      </div>
      <div className="detail-body">
        <h3>{detail.fish.name}</h3>
        <dl className="facts">
          <div>
            <dt>Место</dt>
            <dd>
              {detail.waterbody.name}, {fmtCoord(detail.coordX, detail.coordY)}
            </dd>
          </div>
          <div>
            <dt>Поимка</dt>
            <dd>
              {fmtDate(detail.catchDate)} · {CATCH_LABEL[detail.catchType]}
            </dd>
          </div>
          <div>
            <dt>Игрок</dt>
            <dd>{detail.author.nickname}</dd>
          </div>
        </dl>
        {detail.comment && <p className="author-comment">{detail.comment}</p>}
        {detail.screenshots.length > 0 && (
          <div className="thumbs">
            {detail.screenshots.map((s, i) => (
              <button key={s.id} type="button" onClick={() => onOpenShots(detail.screenshots, i)}>
                <img src={api.fileUrl(s.url)} alt="" />
              </button>
            ))}
          </div>
        )}
        <section className="thread">
          <h4>Комментарии</h4>
          {detail.comments?.length === 0 && <p className="empty">Пока тихо — напишите первым</p>}
          {detail.comments?.map((c) => (
            <article key={c.id} className="comment">
              <header>
                <strong>{c.author.nickname}</strong>
                <time>{fmtDateTime(c.createdAt)}</time>
                {(user?.role === "admin" || user?.id === c.author.id) && (
                  <button
                    type="button"
                    className="linkish"
                    onClick={async () => {
                      await api.deleteComment(c.id);
                      await refreshDetail();
                    }}
                  >
                    удалить
                  </button>
                )}
              </header>
              <p>{c.text}</p>
              {c.screenshots.length > 0 && (
                <div className="thumbs sm">
                  {c.screenshots.map((s, i) => (
                    <button key={s.id} type="button" onClick={() => onOpenShots(c.screenshots, i)}>
                      <img src={api.fileUrl(s.url)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
          <form className="comment-form" onSubmit={(e) => void sendComment(e)}>
            <textarea
              rows={3}
              placeholder="Комментарий к посту"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <label className="file-pick">
              <input
                key={fileKey}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 8))}
              />
              <span>
                {files.length > 0
                  ? `Выбрано файлов: ${files.length}`
                  : "Прикрепить скриншоты"}
              </span>
            </label>
            <button className="btn primary" disabled={busy || !text.trim()} type="submit">
              Отправить
            </button>
          </form>
        </section>
      </div>
    </aside>
  );
}
