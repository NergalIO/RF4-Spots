import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/api";
import type { AdminStats, AdminUser, Invite, ModerationReport, VerificationRequest } from "@/types";
import { usePersistedTab } from "@/shared/usePersistedTab";
import { REPORT_STATUSES, type ReportStatusFilter } from "./AdminReports";

const TAB_KEY = "rf4spots-admin-tab";
const USERS_SUB_KEY = "rf4spots-admin-users-sub";
const REPORT_FILTER_KEY = "rf4spots-admin-reports";
const POLL_MS = 30_000;
export const ADMIN_TABS = ["dashboard", "users", "invites", "reports"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];
export const USERS_SUBTABS = ["list", "verification"] as const;
export type UsersSubTab = (typeof USERS_SUBTABS)[number];

export function useAdminData(api: Api) {
  const [tab, setTab] = usePersistedTab(TAB_KEY, ADMIN_TABS, "dashboard" as AdminTab);
  const [usersSub, setUsersSub] = usePersistedTab(USERS_SUB_KEY, USERS_SUBTABS, "list" as UsersSubTab);
  const [reportStatus, setReportStatus] = usePersistedTab(
    REPORT_FILTER_KEY,
    REPORT_STATUSES,
    "open" as ReportStatusFilter,
  );
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
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

  const loadVerification = useCallback(async () => {
    const v = await api.admin.verificationRequests("pending");
    setVerificationRequests(v.requests);
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
      else if (tab === "users") {
        if (usersSub === "verification") await loadVerification();
        else await loadUsers();
      } else if (tab === "invites") await loadInvites();
      else await loadReports(reportStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, [tab, usersSub, reportStatus, loadDashboard, loadUsers, loadVerification, loadInvites, loadReports]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (tab !== "dashboard" && tab !== "users") return;
    const id = window.setInterval(() => {
      void (tab === "dashboard"
        ? loadDashboard()
        : usersSub === "verification"
          ? loadVerification()
          : loadUsers()
      ).catch((err) => {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [tab, usersSub, loadDashboard, loadUsers, loadVerification]);

  return {
    tab,
    setTab,
    usersSub,
    setUsersSub,
    reportStatus,
    setReportStatus,
    users,
    invites,
    setInvites,
    verificationRequests,
    setVerificationRequests,
    openReports,
    reports,
    stats,
    error,
    setError,
    reload,
  };
}
