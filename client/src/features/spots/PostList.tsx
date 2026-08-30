import { useEffect, useMemo, useRef, useState } from "react";
import { CATCH_LABEL, fmtCoord, fmtWhen } from "@/shared/format";
import { ALL_WATERBODIES } from "@/constants";
import { FishCombobox } from "@/shared/ui/FishCombobox";
import { DateRangePicker } from "@/shared/ui/DateRangePicker";
import { useStore } from "@/store";
import type { CatchType } from "@/types";
import { loadFilterSlots, saveFilterSlots, type FilterKey } from "@/persist";
import { ruNewComments, unreadOf } from "@/unread";

const FILTER_OPTIONS: { id: FilterKey; label: string }[] = [
  { id: "search", label: "Поиск" },
  { id: "fish", label: "Вид рыбы" },
  { id: "catchType", label: "Тип поимки" },
  { id: "catchDate", label: "Дата поимки" },
  { id: "uploadedDate", label: "Дата загрузки" },
  { id: "mine", label: "Только мои" },
  { id: "favorite", label: "Избранное" },
  { id: "sort", label: "Сортировка" },
];

type Props = {
  onCollapse?: () => void;
  onSelect?: (id: string) => void;
  onShowMap?: () => void;
};

export function PostList({ onCollapse, onSelect, onShowMap }: Props) {
  const posts = useStore((s) => s.posts);
  const nextCursor = useStore((s) => s.nextCursor);
  const loadMorePosts = useStore((s) => s.loadMorePosts);
  const fish = useStore((s) => s.fish);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const selectedId = useStore((s) => s.selectedId);
  const selectPost = useStore((s) => s.selectPost);
  const openOnMap = useStore((s) => s.openOnMap);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const user = useStore((s) => s.user);
  const seen = useStore((s) => s.seen);
  const allMaps = waterbodyId === ALL_WATERBODIES;
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<FilterKey[]>(() => loadFilterSlots());
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveFilterSlots(slots);
  }, [slots]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!addRef.current?.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unused = useMemo(
    () => FILTER_OPTIONS.filter((o) => !slots.includes(o.id)),
    [slots],
  );

  const activeCount = [
    filters.q,
    filters.fishId,
    filters.catchType,
    filters.catchFrom || filters.catchTo,
    filters.uploadedFrom || filters.uploadedTo,
    filters.mine ? "1" : "",
    filters.favorite ? "1" : "",
    filters.sort !== "createdAt" ? filters.sort : "",
  ].filter(Boolean).length;

  function openPost(id: string) {
    const next = id === selectedId ? null : id;
    void selectPost(next);
    if (next) onSelect?.(next);
  }

  function addSlot(id: FilterKey) {
    setSlots((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setAddOpen(false);
    setOpen(true);
    if (id === "mine") void setFilters({ mine: true });
    if (id === "favorite") void setFilters({ favorite: true });
  }

  function removeSlot(id: FilterKey) {
    setSlots((prev) => prev.filter((k) => k !== id));
    if (id === "fish") void setFilters({ fishId: "" });
    if (id === "catchType") void setFilters({ catchType: "" });
    if (id === "catchDate") void setFilters({ catchFrom: "", catchTo: "" });
    if (id === "uploadedDate") void setFilters({ uploadedFrom: "", uploadedTo: "" });
    if (id === "sort") void setFilters({ sort: "createdAt" });
    if (id === "mine") void setFilters({ mine: false });
    if (id === "favorite") void setFilters({ favorite: false });
    if (id === "search") void setFilters({ q: "" });
  }

  return (
    <aside className="panel left">
      <div className="panel-head">
        <h2>Посты</h2>
        <div className="head-actions">
          <span className="count">{posts.length}</span>
          {onCollapse && (
            <button type="button" className="pane-toggle" onClick={onCollapse} title="Скрыть панель">
              ‹
            </button>
          )}
        </div>
      </div>
      <div className="filters-block">
        <button
          type="button"
          className={`filters-toggle ${open ? "open" : ""}`}
          onClick={() => {
            setOpen((v) => !v);
            setAddOpen(false);
          }}
        >
          <span>Фильтры</span>
          {activeCount > 0 && <span className="count">{activeCount}</span>}
          <span className="filters-chevron">{open ? "▾" : "▸"}</span>
        </button>
        {open && (
          <div className="filters">
            {slots.map((id) => (
              <div key={id} className="filter-row">
                <div className="filter-row-head">
                  <span>{FILTER_OPTIONS.find((o) => o.id === id)?.label}</span>
                  <button type="button" className="filter-remove" onClick={() => removeSlot(id)} aria-label="Убрать">
                    ×
                  </button>
                </div>
                {id === "search" && (
                  <input
                    value={filters.q}
                    onChange={(e) => void setFilters({ q: e.target.value })}
                    placeholder="Текст поста или комментария"
                  />
                )}
                {id === "fish" && (
                  <FishCombobox
                    fish={fish}
                    value={filters.fishId}
                    onChange={(fishId) => void setFilters({ fishId })}
                    placeholder="Все виды"
                    allowEmpty
                    waterbodyId={allMaps ? undefined : waterbodyId}
                  />
                )}
                {id === "catchType" && (
                  <select
                    value={filters.catchType}
                    onChange={(e) => void setFilters({ catchType: e.target.value as CatchType | "" })}
                  >
                    <option value="">Все типы</option>
                    <option value="farm">Фарм</option>
                    <option value="trophy">Трофей</option>
                    <option value="farm_trophy">Фарм с трофеями</option>
                  </select>
                )}
                {id === "catchDate" && (
                  <DateRangePicker
                    from={filters.catchFrom}
                    to={filters.catchTo}
                    onChange={(catchFrom, catchTo) => void setFilters({ catchFrom, catchTo })}
                  />
                )}
                {id === "uploadedDate" && (
                  <DateRangePicker
                    from={filters.uploadedFrom}
                    to={filters.uploadedTo}
                    onChange={(uploadedFrom, uploadedTo) => void setFilters({ uploadedFrom, uploadedTo })}
                  />
                )}
                {id === "mine" && (
                  <label className="chip">
                    <input
                      type="checkbox"
                      checked={filters.mine}
                      onChange={(e) => void setFilters({ mine: e.target.checked })}
                    />
                    Только мои посты
                  </label>
                )}
                {id === "favorite" && (
                  <label className="chip">
                    <input
                      type="checkbox"
                      checked={filters.favorite}
                      onChange={(e) => void setFilters({ favorite: e.target.checked })}
                    />
                    Только избранное
                  </label>
                )}
                {id === "sort" && (
                  <select
                    value={filters.sort}
                    onChange={(e) => void setFilters({ sort: e.target.value as "createdAt" | "catchDate" })}
                  >
                    <option value="createdAt">Сначала новые загрузки</option>
                    <option value="catchDate">Сначала свежие поимки</option>
                  </select>
                )}
              </div>
            ))}
            {unused.length > 0 && (
              <div className="filter-add-wrap" ref={addRef}>
                <button
                  type="button"
                  className="filter-add"
                  onClick={() => setAddOpen((v) => !v)}
                  aria-label="Добавить фильтр"
                >
                  +
                </button>
                {addOpen && (
                  <div className="filter-add-menu">
                    {unused.map((o) => (
                      <button key={o.id} type="button" onClick={() => addSlot(o.id)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {slots.length === 0 && unused.length > 0 && (
              <p className="filter-empty">Нажмите +, чтобы добавить фильтр</p>
            )}
          </div>
        )}
      </div>
      <div className="card-list">
        {posts.length === 0 && (
          <p className="empty">{allMaps ? "Пока нет постов" : "Пока нет постов на этом водоёме"}</p>
        )}
        {posts.map((p) => {
          const unread = user ? unreadOf(p, seen, user.id) : { kind: "none" as const, count: 0 };
          const unreadClass =
            unread.kind === "comments" ? " unread-comments" : unread.kind === "post" ? " unread-post" : "";
          return (
            <article
              key={p.id}
              className={`spot-card ${p.id === selectedId ? "selected" : ""}${unreadClass}`}
            >
              <div className="spot-card-title">
                <button type="button" className="spot-card-name" onClick={() => openPost(p.id)}>
                  <strong>{p.fish.name}</strong>
                </button>
                <button
                  type="button"
                  className={`btn ghost sm fav-btn ${p.favorited ? "on" : ""}`}
                  title={p.favorited ? "Убрать из избранного" : "В избранное"}
                  onClick={() => void toggleFavorite(p)}
                >
                  ★
                </button>
              </div>
              <button type="button" className="spot-card-main" onClick={() => openPost(p.id)}>
                <span className="meta">
                  {allMaps ? `${p.waterbody.name} · ` : ""}
                  {fmtCoord(p.coordX, p.coordY)} · {CATCH_LABEL[p.catchType]}
                </span>
                <span className="meta" title={p.catchDate}>{fmtWhen(p.catchDate)}</span>
                {p.comment && <p className="excerpt">{p.comment}</p>}
                <span className="nick">{p.author.nickname}</span>
                {unread.kind === "post" && <span className="unread-line unread-post-label">Новый пост</span>}
                {unread.kind === "comments" && (
                  <span className="unread-line unread-comments-label">
                    <span className="unread-count">{unread.count}</span>
                    {ruNewComments(unread.count)}
                  </span>
                )}
              </button>
              {allMaps && (
                <div className="spot-card-actions">
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      void openOnMap(p);
                      onShowMap?.();
                    }}
                  >
                    На карте
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {nextCursor && (
          <button type="button" className="btn ghost" onClick={() => void loadMorePosts()}>
            Ещё
          </button>
        )}
      </div>
    </aside>
  );
}
