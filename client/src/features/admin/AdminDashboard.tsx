import type { AdminStats, AdminUser, ModerationReport } from "@/types";
import { fmtWhen } from "@/shared/format";
import { reportCaption, reportPostId } from "./reportTarget";
import { cmpHint, fmtDay, fmtMonth } from "./adminDashboardFormat";
import { BarList, Kpi, Series } from "./AdminDashboardWidgets";

export type AdminTabId = "dashboard" | "users" | "invites" | "reports";


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
