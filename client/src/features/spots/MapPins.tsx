import { Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { CATCH_LABEL } from "@/shared/format";
import type { Waterbody } from "@/types";
import { gameToLatLng } from "./mapCoords";
import { groupCatchType, groupTooltip, type MarkerGroup } from "./mapMarkerGroups";
import { pin } from "./mapPin";

export function MapPins({
  wb,
  groups,
  selectedId,
  isMobile,
  onPick,
}: {
  wb: Waterbody;
  groups: MarkerGroup[];
  selectedId: string | null;
  isMobile: boolean;
  onPick: (id: string) => void;
}) {
  const map = useMap();
  return (
    <>
      {groups.map((group) => {
        const pos = gameToLatLng(wb, group.coordX, group.coordY);
        const selected = Boolean(selectedId && group.posts.some((p) => p.id === selectedId));
        const many = group.posts.length > 1;
        return (
          <Marker
            key={group.key}
            position={[pos.lat, pos.lng]}
            icon={pin(selected, groupCatchType(group.posts, selectedId), group.posts.length)}
            zIndexOffset={selected ? 1000 : many ? 100 : 0}
            keyboard={false}
            eventHandlers={
              many
                ? undefined
                : {
                    click: () => onPick(group.posts[0].id),
                  }
            }
          >
            {(!isMobile || !many) && (
              <Tooltip direction="top" offset={[0, many ? -12 : -8]}>
                {groupTooltip(group)}
              </Tooltip>
            )}
            {many && (
              <Popup className="map-stack-pop" autoPan minWidth={180} maxWidth={260}>
                <div className="map-stack-list" role="list">
                  {group.posts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="listitem"
                      className={p.id === selectedId ? "on" : ""}
                      onClick={() => {
                        onPick(p.id);
                        map.closePopup();
                      }}
                    >
                      <span className={`map-pin ${p.catchType}`} aria-hidden />
                      <span className="map-stack-name">{p.fishName}</span>
                      <span className="muted">{CATCH_LABEL[p.catchType]}</span>
                    </button>
                  ))}
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </>
  );
}
