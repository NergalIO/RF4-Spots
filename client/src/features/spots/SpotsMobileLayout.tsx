import { ALL_WATERBODIES } from "@/shared/constants";
import { MapView } from "./MapView";
import { PostDetail } from "./PostDetail";
import { PostList } from "./PostList";
import type { Post, Screenshot } from "@/types";

export function SpotsMobileLayout({
  visible,
  waterbodyId,
  detail,
  screen,
  setScreen,
  detailOpen,
  openDetail,
  closeDetail,
  showOnMap,
  setCreateAt,
  setEdit,
  setLb,
}: {
  visible: boolean;
  waterbodyId: string;
  detail: Post | null;
  screen: "list" | "map";
  setScreen: (screen: "list" | "map") => void;
  detailOpen: boolean;
  openDetail: () => void;
  closeDetail: () => void;
  showOnMap: () => void;
  setCreateAt: (coords: { x: number; y: number } | null) => void;
  setEdit: (post: Post | null) => void;
  setLb: (lb: { shots: Screenshot[]; index: number } | null) => void;
}) {
  const feedOnly = waterbodyId === ALL_WATERBODIES;
  const showMap = !feedOnly && screen === "map";
  return (
    <div className="workspace mobile-workspace" hidden={!visible}>
      {!feedOnly && (
        <div className="mobile-switch" role="tablist" aria-label="Вид">
          <button type="button" role="tab" aria-selected={!showMap} className={!showMap ? "on" : ""} onClick={() => setScreen("list")}>
            Список
          </button>
          <button type="button" role="tab" aria-selected={showMap} className={showMap ? "on" : ""} onClick={() => setScreen("map")}>
            Карта
          </button>
        </div>
      )}
      <div className="mobile-screen">
        {showMap ? <MapView onCreate={setCreateAt} onSelect={openDetail} /> : <PostList onSelect={openDetail} onShowMap={showOnMap} />}
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
  );
}
