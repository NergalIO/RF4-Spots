import { useEffect, useRef, useState } from "react";
import { ALL_WATERBODIES } from "@/shared/constants";
import { useStore } from "@/store";
import { loadFilterSlots, saveFilterSlots, type FilterKey } from "@/shared/persist";
import { clearField, defaultsFor } from "./filterQuery";
import { PostBulkBar } from "./PostBulkBar";
import { PostListFilters } from "./PostListFilters";
import { nextPickedIds, ruPosts } from "./pickSet";
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
  const api = useStore((s) => s.api);
  const refreshPosts = useStore((s) => s.refreshPosts);
  const refreshMarkers = useStore((s) => s.refreshMarkers);
  const setError = useStore((s) => s.setError);
  const allMaps = waterbodyId === ALL_WATERBODIES;
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<FilterKey[]>(() => loadFilterSlots());
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [pickAnchor, setPickAnchor] = useState<string | null>(null);
  const [actOpen, setActOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    setPicked(new Set());
    setPickAnchor(null);
    setActOpen(false);
  }, [waterbodyId, filters]);

  function openPost(id: string) {
    const next = id === selectedId ? null : id;
    void selectPost(next);
    if (next) onSelect?.(next);
  }

  function addSlot(id: FilterKey) {
    setSlots((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setAddOpen(false);
    setOpen(true);
    void setFilters(defaultsFor(id));
  }

  function removeSlot(id: FilterKey) {
    setSlots((prev) => prev.filter((k) => k !== id));
    void setFilters(clearField(id));
  }

  function changeField(from: FilterKey, to: FilterKey) {
    if (from === to) return;
    setSlots((prev) => prev.map((k) => (k === from ? to : k)));
    void setFilters({ ...clearField(from), ...defaultsFor(to) });
  }

  function togglePick(id: string, shift: boolean) {
    const result = nextPickedIds(
      posts.map((p) => p.id),
      picked,
      id,
      shift,
      pickAnchor,
    );
    setPicked(new Set(result.next));
    setPickAnchor(result.anchor);
  }

  function clearPick() {
    setPicked(new Set());
    setPickAnchor(null);
    setActOpen(false);
  }

  async function hidePicked() {
    const ids = [...picked];
    if (!ids.length) return;
    if (!confirm(`Скрыть ${ids.length} ${ruPosts(ids.length)}?`)) return;
    setActOpen(false);
    setBusy(true);
    try {
      await api.admin.bulkPosts({ ids, action: "hide" });
      if (selectedId && picked.has(selectedId)) await selectPost(null);
      clearPick();
      await refreshPosts();
      await refreshMarkers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось скрыть посты");
    } finally {
      setBusy(false);
    }
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
        changeField={changeField}
        filters={filters}
        setFilters={(patch) => void setFilters(patch)}
        fish={fish}
        waterbodyId={waterbodyId}
        allMaps={allMaps}
      />
      {isAdmin && (
        <PostBulkBar
          picked={picked.size}
          total={posts.length}
          busy={busy}
          actOpen={actOpen}
          onToggleAct={() => setActOpen((v) => !v)}
          onCloseAct={() => setActOpen(false)}
          onPickAll={() => {
            setPicked(new Set(posts.map((p) => p.id)));
            setPickAnchor(posts[0]?.id ?? null);
          }}
          onClear={clearPick}
          onHide={() => void hidePicked()}
        />
      )}
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
            pickable={isAdmin}
            picked={picked.has(p.id)}
            pickLocksOpen={picked.size > 0}
            onTogglePick={(shift) => togglePick(p.id, shift)}
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
