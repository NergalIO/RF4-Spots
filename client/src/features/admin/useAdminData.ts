import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/api";
import type { AdminStats, AdminUser, Invite, ModerationReport } from "@/types";
import { usePersistedTab } from "@/shared/usePersistedTab";
import { REPORT_STATUSES, type ReportStatusFilter } from "./AdminReports";

const TAB_KEY = "rf4spots-admin-tab";
const REPORT_FILTER_KEY = "rf4spots-admin-reports";
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

  const reload = useCallback(async () => {
    setError("");
    try {
      const extra = reportStatus === "open" ? Promise.resolve(null) : api.admin.reports(reportStatus);
      const [u, i, open, s, listed] = await Promise.all([
        api.admin.users(),
        api.admin.invites(),
        api.admin.reports("open"),
        api.admin.stats(),
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
