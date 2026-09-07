import { useEffect, useRef, useState } from "react";
import { ALL_WATERBODIES } from "@/shared/constants";
import { useStore } from "@/store";
import { loadFilterSlots, saveFilterSlots, type FilterKey } from "@/shared/persist";
import { PostListFilters } from "./PostListFilters";
import { SpotCard } from "./SpotCard";

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
  const toggleVote = useStore((s) => s.toggleVote);
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
      <PostListFilters
        open={open}
        setOpen={setOpen}
        slots={slots}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        addRef={addRef}
        addSlot={addSlot}
        removeSlot={removeSlot}
        filters={filters}
        setFilters={(patch) => void setFilters(patch)}
        fish={fish}
        waterbodyId={waterbodyId}
        allMaps={allMaps}
      />
      <div className="card-list">
        {posts.length === 0 && <p className="empty">{allMaps ? "Пока нет постов" : "Пока нет постов на этом водоёме"}</p>}
        {posts.map((p) => (
          <SpotCard
            key={p.id}
            post={p}
            selected={p.id === selectedId}
            allMaps={allMaps}
            seen={seen}
            userId={user?.id}
            onOpen={() => openPost(p.id)}
            onFavorite={() => void toggleFavorite(p)}
            onVote={(value) => void toggleVote(p, value)}
            onShowMap={
              allMaps
                ? () => {
                    void openOnMap(p);
                    onShowMap?.();
                  }
                : undefined
            }
          />
        ))}
        {nextCursor && (
          <button type="button" className="btn ghost" onClick={() => void loadMorePosts()}>
            Ещё
          </button>
        )}
      </div>
    </aside>
  );
}
