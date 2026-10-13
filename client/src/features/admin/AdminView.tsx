import { FormEvent, useCallback, useRef, useState } from "react";
import { useStore } from "@/store";
import { AdminDashboard, type AdminTabId } from "./AdminDashboard";
import { useDismissible } from "@/shared/useDismissible";
import { AdminUsers } from "./AdminUsers";
import { AdminInvites } from "./AdminInvites";
import { AdminReports } from "./AdminReports";
import { AdminVerificationRequests } from "./AdminVerificationRequests";
import { useAdminData } from "./useAdminData";
import { createInvite, deleteUser, patchUser, reopenReport, resolveReport, reviewVerification } from "./adminMutations";
import { AdminUserContextMenu, type UserMenu } from "./AdminUserContextMenu";
import type { AdminUser, Invite } from "@/types";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* ignore */
  }
}

type Props = {
  onOpenPost?: (postId: string) => void;
};

export function AdminView({ onOpenPost }: Props) {
  const api = useStore((s) => s.api);
  const me = useStore((s) => s.user);
  const data = useAdminData(api);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [menu, setMenu] = useState<UserMenu | null>(null);
  const [inviteDetail, setInviteDetail] = useState<Invite | null>(null);
  const [inviteDetailLoading, setInviteDetailLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismissible(Boolean(menu), closeMenu, menuRef);

  function openMenu(user: AdminUser, x: number, y: number) {
    const width = 200;
    const left = Math.min(x, window.innerWidth - width - 8);
    const top = Math.min(y, window.innerHeight - 220);
    setMenu({ user, top, left: Math.max(8, left) });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      data.setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code: string) {
    await copyText(code);
    setCopied(code);
    window.setTimeout(() => setCopied((cur) => (cur === code ? "" : cur)), 1600);
  }

  async function openInvite(id: string) {
    setInviteDetailLoading(true);
    setInviteDetail(null);
    try {
      const { invite } = await api.admin.invite(id);
      setInviteDetail(invite);
    } catch (err) {
      data.setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setInviteDetailLoading(false);
    }
  }

  return (
    <div className="tools-host">
      <nav className="tools-nav" aria-label="Админка">
        <button type="button" className={data.tab === "dashboard" ? "on" : ""} onClick={() => data.setTab("dashboard")}>
          Dashboard
        </button>
        <button type="button" className={data.tab === "users" ? "on" : ""} onClick={() => data.setTab("users")}>
          Игроки
        </button>
        <button
          type="button"
          className={data.tab === "invites" ? "on" : ""}
          onClick={() => {
            data.setTab("invites");
            setInviteDetail(null);
          }}
        >
          Коды подтверждения
        </button>
        <button type="button" className={data.tab === "reports" ? "on" : ""} onClick={() => data.setTab("reports")}>
          Жалобы{data.openReports.length ? ` (${data.openReports.length})` : ""}
        </button>
      </nav>
      <div className="tools-body">
        {data.error && <p className="form-error">{data.error}</p>}
        {data.tab === "dashboard" && (
          <AdminDashboard
            stats={data.stats}
            users={data.users}
            openReports={data.openReports}
            onOpenTab={(tab: AdminTabId) => data.setTab(tab)}
            onOpenPost={onOpenPost}
          />
        )}
        {data.tab === "users" && (
          <>
            <div className="admin-subnav" role="tablist" aria-label="Игроки">
              <button
                type="button"
                className={data.usersSub === "list" ? "on" : ""}
                onClick={() => data.setUsersSub("list")}
              >
                Список
              </button>
              <button
                type="button"
                className={data.usersSub === "verification" ? "on" : ""}
                onClick={() => data.setUsersSub("verification")}
              >
                Запросы на подтверждение профиля
                {data.verificationRequests.length ? ` (${data.verificationRequests.length})` : ""}
              </button>
            </div>
            {data.usersSub === "list" ? (
              <AdminUsers
                users={data.users}
                meId={me?.id}
                busy={busy}
                menuUserId={menu?.user.id}
                onOpenMenu={openMenu}
              />
            ) : (
              <AdminVerificationRequests
                requests={data.verificationRequests}
                busy={busy}
                onReview={(id, status, adminNote) =>
                  void run(async () => {
                    await reviewVerification(api, id, status, adminNote);
                    await data.reload();
                  })
                }
              />
            )}
          </>
        )}
        {data.tab === "invites" && (
          <AdminInvites
            invites={data.invites}
            busy={busy}
            copied={copied}
            detail={inviteDetail}
            detailLoading={inviteDetailLoading}
            onCreate={(e: FormEvent, opts) =>
              void run(async () => {
                const invite = await createInvite(api, e, opts);
                data.setInvites((prev) => [invite, ...prev]);
              })
            }
            onOpen={(id) => void openInvite(id)}
            onCloseDetail={() => setInviteDetail(null)}
            onCopy={(code) => void copyCode(code)}
          />
        )}
        {data.tab === "reports" && (
          <AdminReports
            status={data.reportStatus}
            onStatus={(id) => data.setReportStatus(id)}
            reports={data.reports}
            busy={busy}
            onResolve={(id, hide) =>
              void run(async () => {
                await resolveReport(api, id, hide);
                await data.reload();
              })
            }
            onReopen={(id) =>
              void run(async () => {
                await reopenReport(api, id);
                await data.reload();
              })
            }
            onOpenPost={onOpenPost}
          />
        )}
      </div>
      {menu && (
        <AdminUserContextMenu
          menu={menu}
          menuRef={menuRef}
          busy={busy}
          onPatch={(id, body: { role?: "player" | "admin"; disabled?: boolean; verified?: boolean }) =>
            void run(async () => {
              setMenu(null);
              await patchUser(api, id, body);
              await data.reload();
            })
          }
          onDelete={(id, nickname) =>
            void run(async () => {
              setMenu(null);
              if (await deleteUser(api, id, nickname)) await data.reload();
            })
          }
        />
      )}
    </div>
  );
}
