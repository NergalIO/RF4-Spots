import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/store";
import type { AdminStats, AdminUser, Invite, ModerationReport } from "@/types";
import { AdminDashboard, type AdminTabId } from "./AdminDashboard";
import { usePersistedTab } from "@/shared/usePersistedTab";
import { useDismissible } from "@/shared/useDismissible";
import { AdminUsers } from "./AdminUsers";
import { AdminInvites } from "./AdminInvites";
import { AdminReports, REPORT_STATUSES, type ReportStatusFilter } from "./AdminReports";

const TAB_KEY = "rf4spots-admin-tab";
const REPORT_FILTER_KEY = "rf4spots-admin-reports";
const ADMIN_TABS = ["dashboard", "users", "invites", "reports"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* ignore */
  }
}

type UserMenu = { user: AdminUser; top: number; left: number };

type Props = {
  onOpenPost?: (postId: string) => void;
};

export function AdminView({ onOpenPost }: Props) {
  const api = useStore((s) => s.api);
  const me = useStore((s) => s.user);
  const [tab, setTab] = usePersistedTab(TAB_KEY, ADMIN_TABS, "dashboard" as AdminTab);
  const [reportStatus, setReportStatus] = usePersistedTab(
    REPORT_FILTER_KEY,
    REPORT_STATUSES,
    "open" as ReportStatusFilter,
  );
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [openReports, setOpenReports] = useState<ModerationReport[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [menu, setMenu] = useState<UserMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismissible(Boolean(menu), closeMenu, menuRef);

  const reload = useCallback(async () => {
    setError("");
    try {
      const extra =
        reportStatus === "open" ? Promise.resolve(null) : api.adminReports(reportStatus);
      const [u, i, open, s, listed] = await Promise.all([
        api.adminUsers(),
        api.adminInvites(),
        api.adminReports("open"),
        api.adminStats(),
        extra,
      ]);
      setUsers(u.users);
      setInvites(i.invites);
      setOpenReports(open.reports);
      setReports(listed ? listed.reports : open.reports);
      setStats(s.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, [api, reportStatus]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (tab !== "users" && tab !== "dashboard") return;
    const id = window.setInterval(() => void reload(), 15_000);
    return () => window.clearInterval(id);
  }, [tab, reload]);

  function openMenu(user: AdminUser, x: number, y: number) {
    const width = 200;
    const left = Math.min(x, window.innerWidth - width - 8);
    const top = Math.min(y, window.innerHeight - 220);
    setMenu({ user, top, left: Math.max(8, left) });
  }

  async function patchUser(id: string, body: { role?: "player" | "admin"; disabled?: boolean }) {
    setMenu(null);
    setBusy(true);
    try {
      await api.adminPatchUser(id, body);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string, nickname: string) {
    setMenu(null);
    if (!window.confirm(`Удалить игрока «${nickname}» и все его посты?`)) return;
    setBusy(true);
    try {
      await api.adminDeleteUser(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  }

  async function createInvite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { invite } = await api.adminCreateInvite();
      setInvites((prev) => [invite, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать приглашение");
    } finally {
      setBusy(false);
    }
  }

  async function resolveReport(id: string, hide: boolean) {
    setBusy(true);
    try {
      await api.adminPatchReport(id, { status: "resolved", hide });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обработать жалобу");
    } finally {
      setBusy(false);
    }
  }

  async function reopenReport(id: string) {
    setBusy(true);
    try {
      await api.adminPatchReport(id, { status: "open" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось вернуть жалобу");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code: string) {
    await copyText(code);
    setCopied(code);
    window.setTimeout(() => setCopied((cur) => (cur === code ? "" : cur)), 1600);
  }

  function goTab(next: AdminTabId) {
    setTab(next);
  }

  const menuUser = menu?.user;

  return (
    <div className="tools-host">
      <nav className="tools-nav" aria-label="Админка">
        <button type="button" className={tab === "dashboard" ? "on" : ""} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button type="button" className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>
          Игроки
        </button>
        <button type="button" className={tab === "invites" ? "on" : ""} onClick={() => setTab("invites")}>
          Приглашения
        </button>
        <button type="button" className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>
          Жалобы{openReports.length ? ` (${openReports.length})` : ""}
        </button>
      </nav>
      <div className="tools-body">
        {error && <p className="form-error">{error}</p>}
        {tab === "dashboard" && (
          <AdminDashboard
            stats={stats}
            users={users}
            openReports={openReports}
            onOpenTab={goTab}
            onOpenPost={onOpenPost}
          />
        )}
        {tab === "users" && (
          <AdminUsers
            users={users}
            meId={me?.id}
            busy={busy}
            menuUserId={menuUser?.id}
            onOpenMenu={openMenu}
          />
        )}
        {tab === "invites" && (
          <AdminInvites
            invites={invites}
            busy={busy}
            copied={copied}
            onCreate={(e) => void createInvite(e)}
            onCopy={(code) => void copyCode(code)}
          />
        )}
        {tab === "reports" && (
          <AdminReports
            status={reportStatus}
            onStatus={(id) => setReportStatus(id)}
            reports={reports}
            busy={busy}
            onResolve={(id, hide) => void resolveReport(id, hide)}
            onReopen={(id) => void reopenReport(id)}
            onOpenPost={onOpenPost}
          />
        )}
      </div>
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="user-menu-list admin-ctx"
            role="menu"
            style={{ top: menu.top, left: menu.left }}
          >
            {menu.user.role !== "admin" && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { role: "admin" })}>
                Сделать админом
              </button>
            )}
            {menu.user.role === "admin" && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { role: "player" })}>
                Снять админа
              </button>
            )}
            {!menu.user.disabledAt && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { disabled: true })}>
                Отключить
              </button>
            )}
            {menu.user.disabledAt && (
              <button type="button" role="menuitem" disabled={busy} onClick={() => void patchUser(menu.user.id, { disabled: false })}>
                Включить
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="danger"
              disabled={busy}
              onClick={() => void deleteUser(menu.user.id, menu.user.nickname)}
            >
              Удалить
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
