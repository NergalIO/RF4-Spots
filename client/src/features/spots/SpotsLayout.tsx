import { useState } from "react";
import { ALL_WATERBODIES } from "@/constants";
import { MapView } from "./MapView";
import { PostDetail } from "./PostDetail";
import { PostForm } from "./PostForm";
import { PostList } from "./PostList";
import { Lightbox } from "./Lightbox";
import { useStore } from "@/store";
import type { useResizablePanels } from "@/useResizablePanels";
import type { Post, Screenshot } from "@/types";

type Panels = ReturnType<typeof useResizablePanels>;

export function SpotsLayout({ visible, panels }: { visible: boolean; panels: Panels }) {
  const waterbodyId = useStore((s) => s.waterbodyId);
  const detail = useStore((s) => s.detail);
  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null);
  const [edit, setEdit] = useState<Post | null>(null);
  const [lb, setLb] = useState<{ shots: Screenshot[]; index: number } | null>(null);
  const feedOnly = waterbodyId === ALL_WATERBODIES;

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
      {createAt && <PostForm coords={createAt} onClose={() => setCreateAt(null)} />}
      {edit && <PostForm coords={{ x: edit.coordX, y: edit.coordY }} post={edit} onClose={() => setEdit(null)} />}
      {lb && (
        <Lightbox shots={lb.shots} index={lb.index} onClose={() => setLb(null)} onIndex={(index) => setLb({ ...lb, index })} />
      )}
    </>
  );
}
