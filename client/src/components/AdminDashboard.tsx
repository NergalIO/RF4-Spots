import type { AdminStats, NamedCount } from "../types";

function fmtDay(ymd: string) {
  const parts = ymd.split("-");
  return `${parts[2]}.${parts[1]}`;
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
}

function BarList({ title, rows, empty }: { title: string; rows: NamedCount[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="dash-block">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
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
      )}
    </section>
  );
}

function Series({
  title,
  rows,
  label,
}: {
  title: string;
  rows: { date: string; count: number }[];
  label: (date: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="dash-block">
      <h3>{title}</h3>
      <div className="dash-series">
        {rows.map((row) => (
          <div key={row.date} className="dash-col" title={`${label(row.date)}: ${row.count}`}>
            <div className="dash-col-bar">
              <i style={{ height: `${(row.count / max) * 100}%` }} />
            </div>
            <span>{label(row.date)}</span>
            <b>{row.count}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminDashboard({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <p className="empty">Загрузка статистики…</p>;
  const { posts, comments, screenshots, users, reports, invites } = stats;
  const kpis = [
    { label: "Посты", value: posts.visible, hint: posts.hidden ? `скрыто ${posts.hidden}` : "видимые" },
    { label: "Сегодня", value: posts.today, hint: `вчера ${posts.yesterday}` },
    { label: "За неделю", value: posts.week, hint: "видимые" },
    { label: "За месяц", value: posts.month, hint: `прошлый ${posts.lastMonth}` },
    { label: "В день (месяц)", value: posts.avgPerDayMonth, hint: "среднее" },
    { label: "Комментарии", value: comments.visible, hint: `сегодня ${comments.today}` },
    { label: "Скриншоты", value: screenshots.total, hint: `посты со фото ${posts.withScreenshots}` },
    { label: "Игроки", value: users.total, hint: `онлайн ${users.online}` },
    { label: "Жалобы", value: reports.open, hint: `закрыто ${reports.resolved}` },
    { label: "Инвайты", value: invites.unused, hint: `использовано ${invites.used}` },
  ];
  return (
    <section className="admin-panel dash">
      <div className="earn-head">
        <h3>Dashboard</h3>
        <p className="muted">посты и активность · время Москва</p>
      </div>
      <div className="dash-kpis">
        {kpis.map((k) => (
          <article key={k.label} className="dash-kpi">
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            <small>{k.hint}</small>
          </article>
        ))}
      </div>
      <div className="dash-facts">
        <p>
          Постов с комментариями: <b>{posts.withComments}</b> из {posts.visible}. Без скриншотов:{" "}
          <b>{Math.max(0, posts.visible - posts.withScreenshots)}</b>. Авторов с постами: <b>{users.withPosts}</b>.
          Новых игроков за месяц: <b>{users.newMonth}</b>. Админов: <b>{users.admins}</b>
          {users.disabled ? `, отключено: ${users.disabled}` : ""}. Комментариев за месяц: <b>{comments.month}</b>.
        </p>
      </div>
      <Series title="Посты по дням (30)" rows={stats.days} label={fmtDay} />
      <Series title="Посты по месяцам (12)" rows={stats.months} label={fmtMonth} />
      <div className="dash-grid">
        <BarList title="Водоёмы" rows={stats.waterbodies} empty="Постов пока нет" />
        <BarList title="Тип улова" rows={stats.catchTypes} empty="Нет данных" />
        <BarList title="Рыба" rows={stats.fish} empty="Нет данных" />
        <BarList title="Авторы" rows={stats.authors} empty="Нет данных" />
      </div>
    </section>
  );
}
