import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/api";
import type { AdminStats, AdminUser, Invite, ModerationReport } from "@/types";
import { usePersistedTab } from "@/shared/usePersistedTab";
import { REPORT_STATUSES, type ReportStatusFilter } from "./AdminReports";

const TAB_KEY = "rf4spots-admin-tab";
const REPORT_FILTER_KEY = "rf4spots-admin-reports";
const POLL_MS = 30_000;
export const ADMIN_TABS = ["dashboard", "users", "invites", "reports"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export function useAdminData(api: Api) {
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

  const loadDashboard = useCallback(async () => {
    const [s, u, open] = await Promise.all([api.admin.stats(), api.admin.users(), api.admin.reports("open")]);
    setStats(s.stats);
    setUsers(u.users);
    setOpenReports(open.reports);
  }, [api]);

  const loadUsers = useCallback(async () => {
    const u = await api.admin.users();
    setUsers(u.users);
  }, [api]);

  const loadInvites = useCallback(async () => {
    const i = await api.admin.invites();
    setInvites(i.invites);
  }, [api]);

  const loadReports = useCallback(
    async (status: ReportStatusFilter) => {
      const extra = status === "open" ? Promise.resolve(null) : api.admin.reports(status);
      const [open, listed] = await Promise.all([api.admin.reports("open"), extra]);
      setOpenReports(open.reports);
      setReports(listed ? listed.reports : open.reports);
    },
    [api],
  );

  const reload = useCallback(async () => {
    setError("");
    try {
      if (tab === "dashboard") await loadDashboard();
      else if (tab === "users") await loadUsers();
      else if (tab === "invites") await loadInvites();
      else await loadReports(reportStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, [tab, reportStatus, loadDashboard, loadUsers, loadInvites, loadReports]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (tab !== "dashboard" && tab !== "users") return;
    const id = window.setInterval(() => {
      void (tab === "dashboard" ? loadDashboard() : loadUsers()).catch((err) => {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [tab, loadDashboard, loadUsers]);

  return {
    tab,
    setTab,
    reportStatus,
    setReportStatus,
    users,
    invites,
    setInvites,
    openReports,
    reports,
    stats,
    error,
    setError,
    reload,
  };
}
