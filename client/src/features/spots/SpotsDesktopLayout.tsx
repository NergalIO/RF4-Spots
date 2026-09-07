import { ALL_WATERBODIES } from "@/shared/constants";
import { MapView } from "./MapView";
import { PostDetail } from "./PostDetail";
import { PostList } from "./PostList";
import type { useResizablePanels } from "@/shared/useResizablePanels";
import type { Post, Screenshot } from "@/types";

type Panels = ReturnType<typeof useResizablePanels>;

export function SpotsDesktopLayout({
  visible,
  waterbodyId,
  detail,
  panels,
  setCreateAt,
  setEdit,
  setLb,
}: {
  visible: boolean;
  waterbodyId: string;
  detail: Post | null;
  panels: Panels;
  setCreateAt: (coords: { x: number; y: number } | null) => void;
  setEdit: (post: Post | null) => void;
  setLb: (lb: { shots: Screenshot[]; index: number } | null) => void;
}) {
  const feedOnly = waterbodyId === ALL_WATERBODIES;
  return (
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
  );
}
