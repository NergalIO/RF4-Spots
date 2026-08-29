import type { AdminStats, AdminUser, ModerationReport, NamedCount } from "@/types";
import { fmtWhen } from "@/shared/format";
import { reportCaption, reportPostId } from "./reportTarget";

export type AdminTabId = "dashboard" | "users" | "invites" | "reports";

function fmtDay(ymd: string) {
  const parts = ymd.split("-");
  return `${parts[2]}.${parts[1]}`;
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ru-RU", { month: "short" });
}

function cmpHint(now: number, prev: number, vs: string) {
  const d = now - prev;
  if (d === 0) return `как ${vs}`;
  return `${d > 0 ? `+${d}` : d} к ${vs}`;
}

function BarList({ title, rows, empty }: { title: string; rows: NamedCount[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const shownPct = rows.reduce((sum, r) => sum + r.pct, 0);
  const rest = Math.round((100 - shownPct) * 10) / 10;
  return (
    <section className="dash-block">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <>
          <ul className="dash-bars">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="dash-bar-meta">
                  <span>{row.name}</span>
                  <span className="muted">
                    {row.count} · {row.pct}%
                  </span>
                </div>
                <div className="dash-bar-track">
                  <i style={{ width: `${(row.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {rest > 0.4 && <p className="muted dash-rest">ещё {rest}%</p>}
        </>
      )}
    </section>
  );
}

function Series({
  title,
  rows,
  label,
  tickEvery,
}: {
  title: string;
  rows: { date: string; count: number }[];
  label: (date: string) => string;
  tickEvery: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const last = rows.length - 1;
  return (
    <section className="dash-block">
      <h3>{title}</h3>
      <div className="dash-series">
        {rows.map((row, i) => {
          const tick = i === 0 || i === last || i % tickEvery === 0;
          return (
            <div key={row.date} className="dash-col" title={`${label(row.date)}: ${row.count}`}>
              <div className="dash-col-bar">
                <i style={{ height: `${(row.count / max) * 100}%` }} />
              </div>
              <span>{tick ? label(row.date) : ""}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  trend,
  onClick,
}: {
  label: string;
  value: number | string;
  hint: string;
  trend?: "up" | "down";
  onClick?: () => void;
}) {
  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={trend === "up" ? "dash-up" : trend === "down" ? "dash-down" : undefined}>{hint}</small>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="dash-kpi dash-kpi-btn" onClick={onClick}>
        {body}
      </button>
    );
  }
  return <article className="dash-kpi">{body}</article>;
}

type Props = {
  stats: AdminStats | null;
  users: AdminUser[];
  openReports: ModerationReport[];
  onOpenTab: (tab: AdminTabId) => void;
  onOpenPost?: (postId: string) => void;
};

export function AdminDashboard({ stats, users, openReports, onOpenTab, onOpenPost }: Props) {
  if (!stats) return <p className="empty">Загрузка статистики…</p>;
  const { posts, comments, screenshots, users: u, reports, invites } = stats;
  const online = users.filter((row) => row.online && !row.disabledAt);
  const queue = openReports.slice(0, 5);
  const todayTrend = posts.today === posts.yesterday ? undefined : posts.today > posts.yesterday ? "up" : "down";
  const monthTrend = posts.month === posts.lastMonth ? undefined : posts.month > posts.lastMonth ? "up" : "down";

  return (
    <section className="admin-panel dash">
      <div className="earn-head">
        <h3>Dashboard</h3>
        <p className="muted">время Москва · обновлено {fmtWhen(stats.generatedAt)}</p>
      </div>

      <div className="dash-group">
        <h4>Контент</h4>
        <div className="dash-kpis">
          <Kpi label="Посты" value={posts.visible} hint={posts.hidden ? `скрыто ${posts.hidden}` : "видимые"} />
          <Kpi
            label="Сегодня"
            value={posts.today}
            hint={cmpHint(posts.today, posts.yesterday, "вчера")}
            trend={todayTrend}
          />
          <Kpi label="За неделю" value={posts.week} hint="видимые" />
          <Kpi
            label="За месяц"
            value={posts.month}
            hint={cmpHint(posts.month, posts.lastMonth, "прошлому")}
            trend={monthTrend}
          />
          <Kpi label="Комментарии" value={comments.visible} hint={`сегодня ${comments.today}`} />
          <Kpi label="Скриншоты" value={screenshots.total} hint={`посты со фото ${posts.withScreenshots}`} />
        </div>
        <div className="dash-chips">
          <span>с комментариями {posts.withComments}</span>
          <span>без скриншотов {Math.max(0, posts.visible - posts.withScreenshots)}</span>
          <span>в день {posts.avgPerDayMonth}</span>
          <span>комментарии за месяц {comments.month}</span>
        </div>
      </div>

      <div className="dash-group">
        <h4>Люди</h4>
        <div className="dash-kpis">
          <Kpi label="Игроки" value={u.total} hint={`онлайн ${u.online}`} onClick={() => onOpenTab("users")} />
          <Kpi label="Онлайн" value={u.online} hint="за минуту" onClick={() => onOpenTab("users")} />
          <Kpi label="Новые за месяц" value={u.newMonth} hint="регистрации" />
        </div>
        <div className="dash-chips">
          <span>с постами {u.withPosts}</span>
          <span>админов {u.admins}</span>
          {u.disabled > 0 && <span>отключено {u.disabled}</span>}
        </div>
      </div>

      <div className="dash-group">
        <h4>Модерация</h4>
        <div className="dash-kpis">
          <Kpi
            label="Жалобы"
            value={reports.open}
            hint={`закрыто ${reports.resolved}`}
            onClick={() => onOpenTab("reports")}
          />
          <Kpi
            label="Инвайты"
            value={invites.unused}
            hint={`использовано ${invites.used}`}
            onClick={() => onOpenTab("invites")}
          />
        </div>
      </div>

      <div className="dash-ops">
        <section className="dash-block">
          <h3>Сейчас онлайн</h3>
          {online.length === 0 ? (
            <p className="empty">Никого нет</p>
          ) : (
            <ul className="dash-nicks">
              {online.map((row) => (
                <li key={row.id}>
                  <button type="button" className="dash-nick" onClick={() => onOpenTab("users")}>
                    {row.nickname}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="dash-block">
          <h3>Очередь жалоб</h3>
          {queue.length === 0 ? (
            <p className="empty">Открытых жалоб нет</p>
          ) : (
            <ul className="dash-queue">
              {queue.map((r) => {
                const postId = reportPostId(r);
                return (
                  <li key={r.id}>
                    <button type="button" className="dash-queue-main" onClick={() => onOpenTab("reports")}>
                      <strong>{r.reporter.nickname}</strong>
                      <span>{r.reason}</span>
                      <small>{reportCaption(r)}</small>
                    </button>
                    {postId && onOpenPost && (
                      <button type="button" className="btn ghost sm" onClick={() => onOpenPost(postId)}>
                        Открыть пост
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Series title="Посты по дням (30)" rows={stats.days} label={fmtDay} tickEvery={5} />
      <Series title="Посты по месяцам (12)" rows={stats.months} label={fmtMonth} tickEvery={2} />
      <div className="dash-grid">
        <BarList title="Водоёмы" rows={stats.waterbodies} empty="Постов пока нет" />
        <BarList title="Тип улова" rows={stats.catchTypes} empty="Нет данных" />
        <BarList title="Рыба" rows={stats.fish} empty="Нет данных" />
        <BarList title="Авторы" rows={stats.authors} empty="Нет данных" />
      </div>
    </section>
  );
}
