import { useState } from "react";
import { ALL_WATERBODIES } from "@/constants";
import { MapView } from "./MapView";
import { PostDetail } from "./PostDetail";
import { PostForm } from "./PostForm";
import { PostList } from "./PostList";
import { Lightbox } from "./Lightbox";
import { useStore } from "@/store";
import { useIsMobile } from "@/platform";
import { useBackGuard } from "@/shared/useBackGuard";
import type { useResizablePanels } from "@/useResizablePanels";
import type { Post, Screenshot } from "@/types";

type Panels = ReturnType<typeof useResizablePanels>;

export function SpotsLayout({ visible, panels }: { visible: boolean; panels: Panels }) {
  const waterbodyId = useStore((s) => s.waterbodyId);
  const detail = useStore((s) => s.detail);
  const selectPost = useStore((s) => s.selectPost);
  const isMobile = useIsMobile();
  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null);
  const [edit, setEdit] = useState<Post | null>(null);
  const [lb, setLb] = useState<{ shots: Screenshot[]; index: number } | null>(null);
  const [screen, setScreen] = useState<"list" | "map">("list");
  const [detailOpen, setDetailOpen] = useState(false);
  const feedOnly = waterbodyId === ALL_WATERBODIES;
  const showMap = !feedOnly && screen === "map";

  function closeDetail() {
    setDetailOpen(false);
    void selectPost(null);
  }

  function showOnMap() {
    setDetailOpen(false);
    setScreen("map");
  }

  useBackGuard(isMobile && detailOpen, closeDetail);
  useBackGuard(Boolean(lb), () => setLb(null));
  useBackGuard(Boolean(createAt), () => setCreateAt(null));
  useBackGuard(Boolean(edit), () => setEdit(null));

  const dialogs = (
    <>
      {createAt && <PostForm coords={createAt} onClose={() => setCreateAt(null)} />}
      {edit && <PostForm coords={{ x: edit.coordX, y: edit.coordY }} post={edit} onClose={() => setEdit(null)} />}
      {lb && (
        <Lightbox shots={lb.shots} index={lb.index} onClose={() => setLb(null)} onIndex={(index) => setLb({ ...lb, index })} />
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="workspace mobile-workspace" hidden={!visible}>
          {!feedOnly && (
            <div className="mobile-switch" role="tablist" aria-label="Вид">
              <button
                type="button"
                role="tab"
                aria-selected={!showMap}
                className={!showMap ? "on" : ""}
                onClick={() => setScreen("list")}
              >
                Список
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={showMap}
                className={showMap ? "on" : ""}
                onClick={() => setScreen("map")}
              >
                Карта
              </button>
            </div>
          )}
          <div className="mobile-screen">
            {showMap ? (
              <MapView onCreate={setCreateAt} onSelect={() => setDetailOpen(true)} />
            ) : (
              <PostList onSelect={() => setDetailOpen(true)} onShowMap={showOnMap} />
            )}
          </div>
          {detailOpen && (
            <div className="mobile-detail">
              <PostDetail
                onEdit={() => detail && setEdit(detail)}
                onOpenShots={(shots, index) => setLb({ shots, index })}
                onBack={closeDetail}
                onShowMap={showOnMap}
              />
            </div>
          )}
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <div className={`workspace ${feedOnly ? "feed-only" : ""}`} hidden={!visible}>
        {panels.leftOpen ? (
          <>
            <div className={`pane pane-left ${feedOnly ? "fill" : ""}`} style={feedOnly ? undefined : { width: panels.leftWidth }}>
              <PostList onCollapse={() => panels.setLeftOpen(false)} />
            </div>
            {!feedOnly && (
              <div
                className="resize-handle"
                onPointerDown={panels.onDrag("left")}
                onDoubleClick={() => panels.resetWidth("left")}
                title="Потяните, чтобы изменить ширину"
              />
            )}
          </>
        ) : (
          <button type="button" className="pane-rail" onClick={() => panels.setLeftOpen(true)} title="Показать посты">
            ›
          </button>
        )}
        {!feedOnly && (
          <div className="pane-center">
            <MapView onCreate={setCreateAt} />
          </div>
        )}
        {panels.rightOpen ? (
          <>
            <div
              className="resize-handle"
              onPointerDown={panels.onDrag("right")}
              onDoubleClick={() => panels.resetWidth("right")}
              title="Потяните, чтобы изменить ширину"
            />
            <div
              className={`pane pane-right ${feedOnly && !panels.leftOpen ? "fill" : ""}`}
              style={feedOnly && !panels.leftOpen ? undefined : { width: panels.rightWidth }}
            >
              <PostDetail
                onEdit={() => detail && setEdit(detail)}
                onOpenShots={(shots, index) => setLb({ shots, index })}
                onCollapse={() => panels.setRightOpen(false)}
              />
            </div>
          </>
        ) : (
          <button type="button" className="pane-rail" onClick={() => panels.setRightOpen(true)} title="Показать детали">
            ‹
          </button>
        )}
      </div>
      {dialogs}
    </>
  );
}
