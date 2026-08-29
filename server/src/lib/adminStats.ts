import { prisma } from "./prisma.js";

export type NamedCount = { id: string; name: string; count: number; pct: number };

export type AdminStats = {
  generatedAt: string;
  posts: {
    total: number;
    visible: number;
    hidden: number;
    today: number;
    yesterday: number;
    week: number;
    month: number;
    lastMonth: number;
    withScreenshots: number;
    withComments: number;
    avgPerDayMonth: number;
  };
  comments: { total: number; visible: number; today: number; month: number };
  screenshots: { total: number };
  users: {
    total: number;
    admins: number;
    disabled: number;
    newMonth: number;
    online: number;
    withPosts: number;
  };
  reports: { open: number; resolved: number; dismissed: number };
  invites: { unused: number; used: number };
  catchTypes: NamedCount[];
  waterbodies: NamedCount[];
  fish: NamedCount[];
  authors: NamedCount[];
  days: { date: string; count: number }[];
  months: { date: string; count: number }[];
};

const TZ = "Europe/Moscow";
const ONLINE_MS = 60 * 1000;

function ymdInTz(d: Date, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function startOfMoscowDay(offsetDays = 0) {
  const ymd = ymdInTz(new Date());
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d - offsetDays, 0, 0, 0) - 3 * 60 * 60 * 1000;
  return new Date(utc);
}

function startOfMoscowMonth(offsetMonths = 0) {
  const ymd = ymdInTz(new Date());
  const [y, m] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + offsetMonths, 1, 0, 0, 0) - 3 * 60 * 60 * 1000);
  return dt;
}

function withPct(rows: { id: string; name: string; count: number }[], total: number): NamedCount[] {
  const den = total || 1;
  return rows
    .map((r) => ({ ...r, pct: Math.round((r.count / den) * 1000) / 10 }))
    .sort((a, b) => b.count - a.count);
}

const STATS_TTL_MS = 15_000;
let statsCache: { at: number; value: AdminStats } | null = null;

export async function collectAdminStats(): Promise<AdminStats> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return statsCache.value;
  const value = await computeAdminStats();
  statsCache = { at: Date.now(), value };
  return value;
}

export function clearAdminStatsCache() {
  statsCache = null;
}

async function computeAdminStats(): Promise<AdminStats> {
  const today = startOfMoscowDay(0);
  const yesterday = startOfMoscowDay(1);
  const week = startOfMoscowDay(6);
  const month = startOfMoscowMonth(0);
  const lastMonth = startOfMoscowMonth(-1);
  const daySince = startOfMoscowDay(29);
  const monthSince = startOfMoscowMonth(-11);
  const onlineSince = new Date(Date.now() - ONLINE_MS);

  const visible = { deletedAt: null } as const;

  const [
    postsTotal,
    postsVisible,
    postsToday,
    postsYesterday,
    postsWeek,
    postsMonth,
    postsLastMonth,
    postsWithShots,
    postsWithComments,
    commentsTotal,
    commentsVisible,
    commentsToday,
    commentsMonth,
    screenshots,
    usersTotal,
    usersAdmins,
    usersDisabled,
    usersNewMonth,
    usersOnline,
    usersWithPosts,
    reportsOpen,
    reportsResolved,
    reportsDismissed,
    invitesUnused,
    invitesUsed,
    catchGroups,
    wbGroups,
    fishGroups,
    authorGroups,
    waterbodies,
    fishRows,
    userRows,
    dayRows,
    monthRows,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: visible }),
    prisma.post.count({ where: { ...visible, createdAt: { gte: today } } }),
    prisma.post.count({ where: { ...visible, createdAt: { gte: yesterday, lt: today } } }),
    prisma.post.count({ where: { ...visible, createdAt: { gte: week } } }),
    prisma.post.count({ where: { ...visible, createdAt: { gte: month } } }),
    prisma.post.count({ where: { ...visible, createdAt: { gte: lastMonth, lt: month } } }),
    prisma.post.count({ where: { ...visible, screenshots: { some: {} } } }),
    prisma.post.count({ where: { ...visible, comments: { some: { deletedAt: null } } } }),
    prisma.comment.count(),
    prisma.comment.count({ where: visible }),
    prisma.comment.count({ where: { ...visible, createdAt: { gte: today } } }),
    prisma.comment.count({ where: { ...visible, createdAt: { gte: month } } }),
    prisma.screenshot.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: month } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: onlineSince }, disabledAt: null } }),
    prisma.post.findMany({ where: visible, distinct: ["userId"], select: { userId: true } }).then((r) => r.length),
    prisma.report.count({ where: { status: "open" } }),
    prisma.report.count({ where: { status: "resolved" } }),
    prisma.report.count({ where: { status: "dismissed" } }),
    prisma.invite.count({ where: { usedAt: null } }),
    prisma.invite.count({ where: { usedAt: { not: null } } }),
    prisma.post.groupBy({ by: ["catchType"], where: visible, _count: { _all: true } }),
    prisma.post.groupBy({ by: ["waterbodyId"], where: visible, _count: { _all: true } }),
    prisma.post.groupBy({ by: ["fishId"], where: visible, _count: { _all: true } }),
    prisma.post.groupBy({ by: ["userId"], where: visible, _count: { _all: true } }),
    prisma.waterbody.findMany({ select: { id: true, name: true } }),
    prisma.fishSpecies.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, nickname: true } }),
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS count
      FROM "Post"
      WHERE "deletedAt" IS NULL AND "createdAt" >= ${daySince}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM') AS date,
             COUNT(*)::int AS count
      FROM "Post"
      WHERE "deletedAt" IS NULL AND "createdAt" >= ${monthSince}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  const wbNames = new Map(waterbodies.map((w) => [w.id, w.name]));
  const fishNames = new Map(fishRows.map((f) => [f.id, f.name]));
  const nickNames = new Map(userRows.map((u) => [u.id, u.nickname]));
  const catchLabels: Record<string, string> = {
    farm: "Фарм",
    trophy: "Трофей",
    farm_trophy: "Фарм с трофеями",
  };

  const days = fillDays(dayRows, 30);
  const months = fillMonthRange(monthRows, 12);
  const monthDays = Math.max(1, Math.round((Date.now() - month.getTime()) / 86400000) + 1);

  return {
    generatedAt: new Date().toISOString(),
    posts: {
      total: postsTotal,
      visible: postsVisible,
      hidden: postsTotal - postsVisible,
      today: postsToday,
      yesterday: postsYesterday,
      week: postsWeek,
      month: postsMonth,
      lastMonth: postsLastMonth,
      withScreenshots: postsWithShots,
      withComments: postsWithComments,
      avgPerDayMonth: Math.round((postsMonth / monthDays) * 10) / 10,
    },
    comments: { total: commentsTotal, visible: commentsVisible, today: commentsToday, month: commentsMonth },
    screenshots: { total: screenshots },
    users: {
      total: usersTotal,
      admins: usersAdmins,
      disabled: usersDisabled,
      newMonth: usersNewMonth,
      online: usersOnline,
      withPosts: usersWithPosts,
    },
    reports: { open: reportsOpen, resolved: reportsResolved, dismissed: reportsDismissed },
    invites: { unused: invitesUnused, used: invitesUsed },
    catchTypes: withPct(
      catchGroups.map((g) => ({
        id: g.catchType,
        name: catchLabels[g.catchType] ?? g.catchType,
        count: g._count._all,
      })),
      postsVisible,
    ),
    waterbodies: withPct(
      wbGroups.map((g) => ({
        id: g.waterbodyId,
        name: wbNames.get(g.waterbodyId) ?? g.waterbodyId,
        count: g._count._all,
      })),
      postsVisible,
    ),
    fish: withPct(
      fishGroups.map((g) => ({
        id: g.fishId,
        name: fishNames.get(g.fishId) ?? g.fishId,
        count: g._count._all,
      })),
      postsVisible,
    ).slice(0, 20),
    authors: withPct(
      authorGroups.map((g) => ({
        id: g.userId,
        name: nickNames.get(g.userId) ?? g.userId,
        count: g._count._all,
      })),
      postsVisible,
    ).slice(0, 20),
    days,
    months,
  };
}

function fillDays(rows: { date: string; count: number }[], length: number) {
  const map = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const out: { date: string; count: number }[] = [];
  for (let i = length - 1; i >= 0; i--) {
    const key = ymdInTz(new Date(Date.now() - i * 86400000));
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  return out;
}

function fillMonthRange(rows: { date: string; count: number }[], length: number) {
  const map = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const out: { date: string; count: number }[] = [];
  const now = new Date();
  const ymd = ymdInTz(now);
  let [y, m] = ymd.split("-").map(Number);
  for (let i = 0; i < length; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.unshift({ date: key, count: map.get(key) ?? 0 });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

export const ONLINE_WINDOW_MS = ONLINE_MS;
