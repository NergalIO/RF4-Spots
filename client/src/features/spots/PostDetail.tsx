import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { CATCH_LABEL, fmtCoord, fmtWhen } from "@/shared/format";
import { ALL_WATERBODIES } from "@/shared/constants";
import { useStore } from "@/store";
import type { Screenshot } from "@/types";
import { ShotPicker } from "./ShotPicker";
import { VoteButtons } from "./VoteButtons";
import { CommentThread } from "./CommentThread";
import { PostDetailHeader } from "./PostDetailHeader";
import { ReportForm } from "./ReportForm";
import { copyCoords, removePost, sendComment, sendReport } from "./postDetailApi";

type Props = {
  onEdit: () => void;
  onOpenShots: (shots: Screenshot[], index: number) => void;
  onCollapse?: () => void;
  onBack?: () => void;
  onShowMap?: () => void;
};

export function PostDetail({ onEdit, onOpenShots, onCollapse, onBack, onShowMap }: Props) {
  const detail = useStore((s) => s.detail);
  const user = useStore((s) => s.user);
  const api = useStore((s) => s.api);
  const selectPost = useStore((s) => s.selectPost);
  const refreshPosts = useStore((s) => s.refreshPosts);
  const refreshDetail = useStore((s) => s.refreshDetail);
  const refreshMarkers = useStore((s) => s.refreshMarkers);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const toggleVote = useStore((s) => s.toggleVote);
  const openOnMap = useStore((s) => s.openOnMap);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportFor, setReportFor] = useState<{ postId?: string; commentId?: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [actOpen, setActOpen] = useState(false);
  const closeAct = useCallback(() => setActOpen(false), []);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  function fitCommentBox() {
    const el = commentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  useEffect(() => {
    setText("");
    setFiles([]);
    setError("");
    setReportFor(null);
    setReportReason("");
    setActOpen(false);
    requestAnimationFrame(fitCommentBox);
  }, [detail?.id]);

  const backButton = onBack && (
    <button type="button" className="pane-back" onClick={onBack} aria-label="Назад">
      ‹
    </button>
  );

  if (!detail) {
    return (
      <aside className="panel right">
        <PostDetailHeader
          post={null}
          user={user}
          waterbodyId={waterbodyId}
          actOpen={false}
          onToggleAct={() => {}}
          onCloseAct={() => {}}
          onFavorite={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onReport={() => {}}
          onCollapse={onCollapse}
          backButton={backButton}
        />
        <p className="empty">
          {onBack
            ? "Загрузка…"
            : waterbodyId === ALL_WATERBODIES
              ? "Выберите пост слева"
              : "Выберите пост слева или точку на карте"}
        </p>
      </aside>
    );
  }

  const post = detail;

  async function onRemove() {
    await removePost(api, post, async () => {
      await selectPost(null);
      await refreshPosts();
      await refreshMarkers();
    });
  }

  async function onSendComment(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await sendComment(api, post.id, text, files);
      setText("");
      setFiles([]);
      requestAnimationFrame(fitCommentBox);
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  async function onSendReport(e: FormEvent) {
    e.preventDefault();
    if (!reportFor || reportReason.trim().length < 3) return;
    setBusy(true);
    try {
      await sendReport(api, reportFor, reportReason);
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
      <PostDetailHeader
        post={post}
        user={user}
        waterbodyId={waterbodyId}
        actOpen={actOpen}
        onToggleAct={() => setActOpen((v) => !v)}
        onCloseAct={closeAct}
        onFavorite={() => void toggleFavorite(post)}
        onShowMap={() => {
          void openOnMap(post);
          onShowMap?.();
        }}
        onEdit={() => {
          closeAct();
          onEdit();
        }}
        onDelete={() => {
          closeAct();
          void onRemove();
        }}
        onReport={() => {
          closeAct();
          setReportFor({ postId: post.id });
        }}
        onCollapse={onCollapse}
        backButton={backButton}
      />
      <div className="detail-body">
        <h3>{detail.fish.name}</h3>
        <dl className="facts">
          <div>
            <dt>Место</dt>
            <dd>
              {detail.waterbody.name}, {fmtCoord(detail.coordX, detail.coordY)}{" "}
              <button type="button" className="linkish" onClick={() => void copyCoords(post.coordX, post.coordY)}>
                копировать
              </button>
            </dd>
          </div>
          <div>
            <dt>Поимка</dt>
            <dd title={detail.catchDate}>
              {fmtWhen(detail.catchDate)} · {CATCH_LABEL[detail.catchType]}
            </dd>
          </div>
          <div className="fact-player">
            <dt>Игрок</dt>
            <dd>
              <span>{detail.author.nickname}</span>
              <VoteButtons post={post} onVote={(value) => void toggleVote(post, value)} />
            </dd>
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
          <ReportForm
            reason={reportReason}
            busy={busy}
            onReason={setReportReason}
            onCancel={() => setReportFor(null)}
            onSubmit={(e) => void onSendReport(e)}
          />
        )}
        <CommentThread
          comments={detail.comments}
          user={user}
          fileUrl={(url) => api.fileUrl(url)}
          onDelete={async (id) => {
            if (!confirm("Скрыть комментарий?")) return;
            await api.comments.remove(id);
            await refreshDetail();
          }}
          onReport={(id) => setReportFor({ commentId: id })}
          onOpenShots={onOpenShots}
        />
      </div>
      <form className="comment-form detail-composer" onSubmit={(e) => void onSendComment(e)}>
        {error && <p className="form-error">{error}</p>}
        <ShotPicker files={files} onChange={setFiles} onlyWhenFocused>
          <textarea
            ref={commentRef}
            rows={1}
            placeholder="Сообщение"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              fitCommentBox();
            }}
            onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }}
          />
          <button className="composer-send" disabled={busy || !text.trim()} type="submit" aria-label="Отправить" title="Отправить">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path
                fill="currentColor"
                d="M3.4 11.2 20.1 3.8c.7-.3 1.4.4 1.1 1.1l-7.4 16.7c-.3.7-1.3.7-1.6 0l-2.8-6.4-6.4-2.8c-.7-.3-.7-1.3 0-1.6Z"
              />
            </svg>
          </button>
        </ShotPicker>
      </form>
    </aside>
  );
}
