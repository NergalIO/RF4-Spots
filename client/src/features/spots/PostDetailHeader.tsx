import type { ReactNode } from "react";
import { ALL_WATERBODIES } from "@/shared/constants";
import { DropdownMenu } from "@/shared/DropdownMenu";
import type { Post, User } from "@/types";

export function PostDetailHeader({
  post,
  user,
  waterbodyId,
  actOpen,
  onToggleAct,
  onCloseAct,
  onFavorite,
  onShowMap,
  onEdit,
  onDelete,
  onReport,
  onCollapse,
  backButton,
}: {
  post: Post | null;
  user: User | null | undefined;
  waterbodyId: string;
  actOpen: boolean;
  onToggleAct: () => void;
  onCloseAct: () => void;
  onFavorite: () => void;
  onShowMap?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onCollapse?: () => void;
  backButton: ReactNode;
}) {
  const canMod = Boolean(post && (user?.role === "admin" || user?.id === post.author.id));
  const canReport = Boolean(post && user && user.id !== post.author.id);
  return (
    <div className="panel-head">
      {backButton}
      <h2>Детали</h2>
      {post && (
        <div className="head-actions">
          <button type="button" className={`btn ghost sm ${post.favorited ? "on" : ""}`} onClick={onFavorite}>
            ★
          </button>
          {waterbodyId === ALL_WATERBODIES && onShowMap && (
            <button type="button" className="btn ghost sm" onClick={onShowMap}>
              На карте
            </button>
          )}
          {(canMod || canReport) && (
            <DropdownMenu
              open={actOpen}
              onClose={onCloseAct}
              trigger={
                <button
                  type="button"
                  className={`btn ghost sm ${actOpen ? "on" : ""}`}
                  aria-haspopup="menu"
                  aria-expanded={actOpen}
                  aria-label="Действия"
                  onClick={onToggleAct}
                >
                  ⋮
                </button>
              }
            >
              {canMod && (
                <button type="button" role="menuitem" onClick={onEdit}>
                  Изменить
                </button>
              )}
              {canMod && (
                <button type="button" role="menuitem" className="danger" onClick={onDelete}>
                  Удалить
                </button>
              )}
              {canReport && (
                <button type="button" role="menuitem" onClick={onReport}>
                  Жалоба
                </button>
              )}
            </DropdownMenu>
          )}
          {onCollapse && (
            <button type="button" className="pane-toggle" onClick={onCollapse} title="Скрыть панель">
              ›
            </button>
          )}
        </div>
      )}
      {!post && onCollapse && (
        <button type="button" className="pane-toggle" onClick={onCollapse} title="Скрыть панель">
          ›
        </button>
      )}
    </div>
  );
}
