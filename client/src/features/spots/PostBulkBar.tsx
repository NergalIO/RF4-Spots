import { DropdownMenu } from "@/shared/DropdownMenu";
import { ruPosts } from "./pickSet";

export function PostBulkBar({
  picked,
  total,
  busy,
  actOpen,
  onToggleAct,
  onCloseAct,
  onPickAll,
  onClear,
  onHide,
}: {
  picked: number;
  total: number;
  busy: boolean;
  actOpen: boolean;
  onToggleAct: () => void;
  onCloseAct: () => void;
  onPickAll: () => void;
  onClear: () => void;
  onHide: () => void;
}) {
  if (!picked) return null;
  return (
    <div className="bulk-bar">
      <div className="bulk-pick">
        <button type="button" className="btn ghost sm" onClick={onPickAll} disabled={busy || picked >= total}>
          Все
        </button>
        <button type="button" className="btn ghost sm" onClick={onClear} disabled={busy}>
          Снять
        </button>
        <span className="bulk-count">
          {picked} {ruPosts(picked)}
        </span>
      </div>
      <DropdownMenu
        open={actOpen}
        onClose={onCloseAct}
        className="bulk-actions"
        listClassName="user-menu-list"
        trigger={
          <button
            type="button"
            className={`btn ghost sm ${actOpen ? "on" : ""}`}
            disabled={busy}
            aria-haspopup="menu"
            aria-expanded={actOpen}
            onClick={onToggleAct}
          >
            Действие
          </button>
        }
      >
        <button type="button" role="menuitem" className="danger" disabled={busy} onClick={onHide}>
          Скрыть
        </button>
      </DropdownMenu>
    </div>
  );
}
