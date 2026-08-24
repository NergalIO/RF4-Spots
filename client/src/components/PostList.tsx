import { CATCH_LABEL, fmtCoord, fmtDate } from "../api";
import { FishCombobox } from "./FishCombobox";
import { useStore } from "../store";
import type { CatchType } from "../types";

export function PostList() {
  const posts = useStore((s) => s.posts);
  const fish = useStore((s) => s.fish);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const selectedId = useStore((s) => s.selectedId);
  const selectPost = useStore((s) => s.selectPost);
  const waterbodyId = useStore((s) => s.waterbodyId);

  return (
    <aside className="panel left">
      <div className="panel-head">
        <h2>Посты</h2>
        <span className="count">{posts.length}</span>
      </div>
      <div className="filters">
        <FishCombobox
          fish={fish}
          value={filters.fishId}
          onChange={(fishId) => void setFilters({ fishId })}
          placeholder="Все виды"
          allowEmpty
          waterbodyId={waterbodyId}
        />
        <select
          value={filters.catchType}
          onChange={(e) => void setFilters({ catchType: e.target.value as CatchType | "" })}
        >
          <option value="">Все типы</option>
          <option value="farm">Фарм</option>
          <option value="trophy">Трофей</option>
          <option value="farm_trophy">Фарм с трофеями</option>
        </select>
        <label>
          Поимка от
          <input type="date" value={filters.catchFrom} onChange={(e) => void setFilters({ catchFrom: e.target.value })} />
        </label>
        <label>
          Поимка до
          <input type="date" value={filters.catchTo} onChange={(e) => void setFilters({ catchTo: e.target.value })} />
        </label>
        <label>
          Загрузка от
          <input
            type="date"
            value={filters.uploadedFrom}
            onChange={(e) => void setFilters({ uploadedFrom: e.target.value })}
          />
        </label>
        <label>
          Загрузка до
          <input
            type="date"
            value={filters.uploadedTo}
            onChange={(e) => void setFilters({ uploadedTo: e.target.value })}
          />
        </label>
        <select value={filters.sort} onChange={(e) => void setFilters({ sort: e.target.value as "createdAt" | "catchDate" })}>
          <option value="createdAt">Сначала новые загрузки</option>
          <option value="catchDate">Сначала свежие поимки</option>
        </select>
      </div>
      <div className="card-list">
        {posts.length === 0 && <p className="empty">Пока нет постов на этом водоёме</p>}
        {posts.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`spot-card ${p.id === selectedId ? "selected" : ""}`}
            onClick={() => void selectPost(p.id === selectedId ? null : p.id)}
          >
            <strong>{p.fish.name}</strong>
            <span className="meta">
              {fmtCoord(p.coordX, p.coordY)} · {CATCH_LABEL[p.catchType]}
            </span>
            <span className="meta">{fmtDate(p.catchDate)}</span>
            {p.comment && <p className="excerpt">{p.comment}</p>}
            <span className="nick">{p.author.nickname}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
