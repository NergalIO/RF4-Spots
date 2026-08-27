import { FormEvent, useEffect, useState } from "react";
import { CATCH_LABEL, fmtCoord, fmtDate, fmtDateTime } from "../api";
import { ALL_WATERBODIES } from "../constants";
import { useStore } from "../store";
import type { Screenshot } from "../types";
import { ShotPicker } from "./ShotPicker";

type Props = {
  onEdit: () => void;
  onOpenShots: (shots: Screenshot[], index: number) => void;
  onCollapse?: () => void;
};

export function PostDetail({ onEdit, onOpenShots, onCollapse }: Props) {
  const detail = useStore((s) => s.detail);
  const user = useStore((s) => s.user);
  const api = useStore((s) => s.api);
  const selectPost = useStore((s) => s.selectPost);
  const refreshPosts = useStore((s) => s.refreshPosts);
  const refreshDetail = useStore((s) => s.refreshDetail);
  const refreshMarkers = useStore((s) => s.refreshMarkers);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const openOnMap = useStore((s) => s.openOnMap);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportFor, setReportFor] = useState<{ postId?: string; commentId?: string } | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    setText("");
    setFiles([]);
    setError("");
    setReportFor(null);
    setReportReason("");
  }, [detail?.id]);

  if (!detail) {
    return (
      <aside className="panel right">
        <div className="panel-head">
          <h2>Детали</h2>
          {onCollapse && (
            <button type="button" className="pane-toggle" onClick={onCollapse} title="Скрыть панель">
              ›
            </button>
          )}
        </div>
        <p className="empty">
          {waterbodyId === ALL_WATERBODIES ? "Выберите пост слева" : "Выберите пост слева или точку на карте"}
        </p>
      </aside>
    );
  }

  const post = detail;
  const canMod = user?.role === "admin" || user?.id === post.author.id;

  async function copyCoords() {
    try {
      await navigator.clipboard.writeText(fmtCoord(post.coordX, post.coordY));
    } catch {
      /* ignore */
    }
  }

  async function removePost() {
    if (!confirm("Скрыть этот пост?")) return;
    await api.deletePost(post.id);
    await selectPost(null);
    await refreshPosts();
    await refreshMarkers();
  }

  async function sendComment(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("text", text.trim());
    for (const f of files) fd.append("screenshots", f);
    try {
      await api.addComment(post.id, fd);
      setText("");
      setFiles([]);
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  async function sendReport(e: FormEvent) {
    e.preventDefault();
    if (!reportFor || reportReason.trim().length < 3) return;
    setBusy(true);
    try {
      await api.report({ ...reportFor, reason: reportReason.trim() });
      setReportFor(null);
      setReportReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить жалобу");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="panel right">
      <div className="panel-head">
        <h2>Детали</h2>
        <div className="head-actions">
          <button
            type="button"
            className={`btn ghost sm ${post.favorited ? "on" : ""}`}
            onClick={() => void toggleFavorite(post)}
          >
            ★
          </button>
          {waterbodyId === ALL_WATERBODIES && (
            <button type="button" className="btn ghost sm" onClick={() => void openOnMap(post)}>
              На карте
            </button>
          )}
          {canMod && (
            <>
              <button type="button" className="btn ghost sm" onClick={onEdit}>
                Изменить
              </button>
              <button type="button" className="btn danger sm" onClick={() => void removePost()}>
                Удалить
              </button>
            </>
          )}
          {user && user.id !== post.author.id && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setReportFor({ postId: post.id })}
            >
              Жалоба
            </button>
          )}
          {onCollapse && (
            <button type="button" className="pane-toggle" onClick={onCollapse} title="Скрыть панель">
              ›
            </button>
          )}
        </div>
      </div>
      <div className="detail-body">
        <h3>{detail.fish.name}</h3>
        <dl className="facts">
          <div>
            <dt>Место</dt>
            <dd>
              {detail.waterbody.name}, {fmtCoord(detail.coordX, detail.coordY)}{" "}
              <button type="button" className="linkish" onClick={() => void copyCoords()}>
                копировать
              </button>
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
        {reportFor && (
          <form className="comment-form" onSubmit={(e) => void sendReport(e)}>
            <textarea
              rows={3}
              placeholder="Почему жалоба"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="row-actions">
              <button type="button" className="btn ghost sm" onClick={() => setReportFor(null)}>
                Отмена
              </button>
              <button className="btn danger sm" disabled={busy || reportReason.trim().length < 3} type="submit">
                Отправить жалобу
              </button>
            </div>
          </form>
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
                      if (!confirm("Скрыть комментарий?")) return;
                      await api.deleteComment(c.id);
                      await refreshDetail();
                    }}
                  >
                    удалить
                  </button>
                )}
                {user && user.id !== c.author.id && (
                  <button type="button" className="linkish" onClick={() => setReportFor({ commentId: c.id })}>
                    жалоба
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
            <ShotPicker files={files} onChange={setFiles} onlyWhenFocused />
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" disabled={busy || !text.trim()} type="submit">
              Отправить
            </button>
          </form>
        </section>
      </div>
    </aside>
  );
}
