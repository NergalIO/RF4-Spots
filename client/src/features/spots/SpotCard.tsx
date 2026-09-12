import { useEffect, useRef } from "react";
import { CATCH_LABEL, fmtCoord, fmtWhen } from "@/shared/format";
import type { Post } from "@/types";
import { ruNewComments, unreadOf, type SeenMap } from "@/features/spots/unread";
import { PostTags } from "./PostTags";
import { VoteButtons } from "./VoteButtons";

export function SpotCard({
  post,
  selected,
  allMaps,
  seen,
  userId,
  pickable,
  picked,
  showPick,
  onTogglePick,
  onOpen,
  onFavorite,
  onVote,
  onShowMap,
}: {
  post: Post;
  selected: boolean;
  allMaps: boolean;
  seen: SeenMap;
  userId?: string;
  pickable?: boolean;
  picked?: boolean;
  showPick?: boolean;
  onTogglePick?: (shift: boolean) => void;
  onOpen: () => void;
  onFavorite: () => void;
  onVote: (value: "like" | "dislike") => void;
  onShowMap?: () => void;
}) {
  const unread = userId ? unreadOf(post, seen, userId) : { kind: "none" as const, count: 0 };
  const unreadClass = unread.kind === "comments" ? " unread-comments" : unread.kind === "post" ? " unread-post" : "";
  const openTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (openTimer.current != null) window.clearTimeout(openTimer.current);
  }, []);

  function clearOpenTimer() {
    if (openTimer.current != null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }

  function onCardClick() {
    if (!pickable) {
      onOpen();
      return;
    }
    clearOpenTimer();
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      onOpen();
    }, 280);
  }

  function onCardDblClick(shift: boolean) {
    if (!pickable) return;
    clearOpenTimer();
    onTogglePick?.(shift);
  }

  return (
    <article className={`spot-card ${selected ? "selected" : ""}${picked ? " picked" : ""}${unreadClass}`}>
      <div className="spot-card-title">
        {showPick && (
          <label className="spot-pick">
            <input
              type="checkbox"
              checked={Boolean(picked)}
              onChange={() => {}}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearOpenTimer();
                onTogglePick?.(e.shiftKey);
              }}
              aria-label="Выбрать пост"
            />
          </label>
        )}
        <button
          type="button"
          className="spot-card-name"
          onClick={onCardClick}
          onDoubleClick={(e) => onCardDblClick(e.shiftKey)}
        >
          <strong>{post.fish.name}</strong>
          <PostTags tags={post.tags ?? []} />
        </button>
        <button
          type="button"
          className={`btn ghost sm fav-btn ${post.favorited ? "on" : ""}`}
          title={post.favorited ? "Убрать из избранного" : "В избранное"}
          onClick={onFavorite}
        >
          ★
        </button>
      </div>
      <button type="button" className="spot-card-main" onClick={onCardClick} onDoubleClick={(e) => onCardDblClick(e.shiftKey)}>
        <span className="meta">
          {allMaps ? `${post.waterbody.name} · ` : ""}
          {fmtCoord(post.coordX, post.coordY)} · {CATCH_LABEL[post.catchType]}
        </span>
        <span className="meta" title={post.catchDate}>
          {fmtWhen(post.catchDate)}
        </span>
        {post.comment && <p className="excerpt">{post.comment}</p>}
      </button>
      <div className="spot-card-nickrow">
        <button type="button" className="nick" onClick={onCardClick} onDoubleClick={(e) => onCardDblClick(e.shiftKey)}>
          {post.author.nickname}
        </button>
        <VoteButtons post={post} onVote={onVote} />
      </div>
      {unread.kind !== "none" && (
        <button type="button" className="spot-card-main" onClick={onCardClick} onDoubleClick={(e) => onCardDblClick(e.shiftKey)}>
          {unread.kind === "post" && <span className="unread-line unread-post-label">Новый пост</span>}
          {unread.kind === "comments" && (
            <span className="unread-line unread-comments-label">
              <span className="unread-count">{unread.count}</span>
              {ruNewComments(unread.count)}
            </span>
          )}
        </button>
      )}
      {allMaps && onShowMap && (
        <div className="spot-card-actions">
          <button type="button" className="btn ghost sm" onClick={onShowMap}>
            На карте
          </button>
        </div>
      )}
    </article>
  );
}
