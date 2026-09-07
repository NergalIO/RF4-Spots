import { createPortal } from "react-dom";
import type { RefObject } from "react";
import type { AdminUser } from "@/types";

export type UserMenu = { user: AdminUser; top: number; left: number };

export function AdminUserContextMenu({
  menu,
  menuRef,
  busy,
  onPatch,
  onDelete,
}: {
  menu: UserMenu;
  menuRef: RefObject<HTMLDivElement>;
  busy: boolean;
  onPatch: (id: string, body: { role?: "player" | "admin"; disabled?: boolean }) => void;
  onDelete: (id: string, nickname: string) => void;
}) {
  return createPortal(
    <div ref={menuRef} className="user-menu-list admin-ctx" role="menu" style={{ top: menu.top, left: menu.left }}>
      {menu.user.role !== "admin" && (
        <button type="button" role="menuitem" disabled={busy} onClick={() => onPatch(menu.user.id, { role: "admin" })}>
          Сделать админом
        </button>
      )}
      {menu.user.role === "admin" && (
        <button type="button" role="menuitem" disabled={busy} onClick={() => onPatch(menu.user.id, { role: "player" })}>
          Снять админа
        </button>
      )}
      {!menu.user.disabledAt && (
        <button type="button" role="menuitem" disabled={busy} onClick={() => onPatch(menu.user.id, { disabled: true })}>
          Отключить
        </button>
      )}
      {menu.user.disabledAt && (
        <button type="button" role="menuitem" disabled={busy} onClick={() => onPatch(menu.user.id, { disabled: false })}>
          Включить
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className="danger"
        disabled={busy}
        onClick={() => onDelete(menu.user.id, menu.user.nickname)}
      >
        Удалить
      </button>
    </div>,
    document.body,
  );
}
