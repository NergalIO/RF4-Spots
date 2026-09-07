import { useMemo, useState } from "react";
import { MapContainer, ImageOverlay, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { fmtCoord } from "@/shared/format";
import { useStore } from "@/store";
import { useIsMobile } from "@/shared/platform";
import { gameToLatLng } from "./mapCoords";
import { pin } from "./mapPin";
import { CenterTracker, FlyToPin, MapEvents, MapSync } from "./MapViewInternals";

type Props = {
  onCreate: (coords: { x: number; y: number }) => void;
  onSelect?: (id: string) => void;
};

export function MapView({ onCreate, onSelect }: Props) {
  const api = useStore((s) => s.api);
  const waterbodies = useStore((s) => s.waterbodies);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const markers = useStore((s) => s.markers);
  const selectedId = useStore((s) => s.selectedId);
  const selectPost = useStore((s) => s.selectPost);
  const rulerOn = useStore((s) => s.rulerOn);
  const toggleRuler = useStore((s) => s.toggleRuler);
  const isMobile = useIsMobile();
  const wb = waterbodies.find((w) => w.id === waterbodyId);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [ruler, setRuler] = useState<{ x: number; y: number }[]>([]);

  const bounds = useMemo(
    () => (wb ? L.latLngBounds([0, 0], [wb.imageHeight, wb.imageWidth]) : null),
    [wb],
  );

  const pins = useMemo(
    () =>
      wb
        ? markers.map((p) => {
            const pos = gameToLatLng(wb, p.coordX, p.coordY);
            return (
              <Marker
                key={p.id}
                position={[pos.lat, pos.lng]}
                icon={pin(p.id === selectedId, p.catchType)}
                keyboard={false}
                eventHandlers={{
                  click: () => {
                    void selectPost(p.id);
                    onSelect?.(p.id);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  {p.fishName} · {fmtCoord(p.coordX, p.coordY)}
                </Tooltip>
              </Marker>
            );
          })
        : [],
    [wb, markers, selectedId, selectPost, onSelect],
  );

  if (!wb || !bounds) return <div className="map-empty">Выберите водоём</div>;

  const dist =
    ruler.length === 2 ? Math.hypot(ruler[1].x - ruler[0].x, ruler[1].y - ruler[0].y) * wb.metersPerCell : null;
  const readout = isMobile ? center : hover;
  const a = ruler[0] ? gameToLatLng(wb, ruler[0].x, ruler[0].y) : null;
  const b = ruler[1] ? gameToLatLng(wb, ruler[1].x, ruler[1].y) : null;

  return (
    <div className={`map-wrap ${isMobile ? "map-touch" : ""}`}>
      <MapContainer
        key={`${wb.id}-${wb.imageWidth}x${wb.imageHeight}-${wb.mapUrl}`}
        crs={L.CRS.Simple}
        center={[wb.imageHeight / 2, wb.imageWidth / 2]}
        zoom={-1}
        maxZoom={4}
        minZoom={-2}
        zoomSnap={0}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={180}
        wheelDebounceTime={20}
        className="leaflet-host"
        attributionControl={false}
      >
        <MapSync wb={wb} />
        <FlyToPin wb={wb} markers={markers} />
        <ImageOverlay url={api.fileUrl(wb.mapUrl)} bounds={bounds} />
        <MapEvents wb={wb} rulerOn={rulerOn} onHover={setHover} onCreate={onCreate} onRuler={setRuler} />
        {isMobile && <CenterTracker wb={wb} onChange={setCenter} />}
        {pins}
        {a && b && (
          <Polyline
            className="map-ruler"
            positions={[
              [a.lat, a.lng],
              [b.lat, b.lng],
            ]}
            pathOptions={{ weight: 2, dashArray: "6 4" }}
          />
        )}
      </MapContainer>
      {isMobile && !rulerOn && <span className="map-crosshair" aria-hidden />}
      <div className="map-hud">
        <span>{readout ? fmtCoord(readout.x, readout.y) : "—:—"}</span>
        {rulerOn && (
          <span className="gold">
            {dist != null ? `${Math.round(dist)} м` : isMobile ? "коснитесь двух точек" : "кликните две точки"}
          </span>
        )}
        {!rulerOn && <span className="muted">{isMobile ? "точка в центре" : "ПКМ — новый пост"}</span>}
      </div>
      {isMobile && (
        <div className="map-actions">
          <button type="button" className={`map-fab ${rulerOn ? "on" : ""}`} onClick={toggleRuler} aria-pressed={rulerOn} aria-label="Линейка">
            ↔
          </button>
          <button type="button" className="map-fab primary" onClick={() => center && onCreate(center)} aria-label="Новый пост в центре карты">
            +
          </button>
        </div>
      )}
    </div>
  );
}
