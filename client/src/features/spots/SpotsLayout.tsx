import { ALL_WATERBODIES } from "@/shared/constants";
import { useIsMobile } from "@/shared/platform";
import { useStore } from "@/store";
import type { useResizablePanels } from "@/shared/useResizablePanels";
import { Lightbox } from "./Lightbox";
import { PostForm } from "./PostForm";
import { SpotsDesktopLayout } from "./SpotsDesktopLayout";
import { SpotsMobileLayout } from "./SpotsMobileLayout";
import { useSpotsDialogs } from "./useSpotsDialogs";

type Panels = ReturnType<typeof useResizablePanels>;

export function SpotsLayout({ visible, panels }: { visible: boolean; panels: Panels }) {
  const waterbodyId = useStore((s) => s.waterbodyId);
  const isMobile = useIsMobile();
  const d = useSpotsDialogs();
  const feedOnly = waterbodyId === ALL_WATERBODIES;

  return (
    <>
      {isMobile ? (
        <SpotsMobileLayout
          visible={visible}
          waterbodyId={waterbodyId}
          detail={d.detail}
          screen={feedOnly ? "list" : d.screen}
          setScreen={d.setScreen}
          detailOpen={d.detailOpen}
          openDetail={d.openDetail}
          closeDetail={d.closeDetail}
          showOnMap={d.showOnMap}
          setCreateAt={d.setCreateAt}
          setEdit={d.setEdit}
          setLb={d.setLb}
        />
      ) : (
        <SpotsDesktopLayout
          visible={visible}
          waterbodyId={waterbodyId}
          detail={d.detail}
          panels={panels}
          setCreateAt={d.setCreateAt}
          setEdit={d.setEdit}
          setLb={d.setLb}
        />
      )}
      {d.createAt && <PostForm coords={d.createAt} onClose={() => d.setCreateAt(null)} />}
      {d.edit && <PostForm coords={{ x: d.edit.coordX, y: d.edit.coordY }} post={d.edit} onClose={() => d.setEdit(null)} />}
      {d.lb && (
        <Lightbox shots={d.lb.shots} index={d.lb.index} onClose={() => d.setLb(null)} onIndex={(index) => d.setLb({ ...d.lb!, index })} />
      )}
    </>
  );
}
