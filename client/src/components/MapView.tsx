import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, ImageOverlay, Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { fmtCoord } from "../api";
import type { CatchType, PostMarker, Waterbody } from "../types";
import { useStore } from "../store";

type Props = {
  onCreate: (coords: { x: number; y: number }) => void;
};

function pin(active: boolean, catchType: CatchType) {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span class="map-pin ${catchType}${active ? " on" : ""}"></span>`,
  });
}

export function pixelToGame(wb: Waterbody, latlng: L.LatLng) {
  const px = latlng.lng;
  const pyFromTop = wb.imageHeight - latlng.lat;
  const innerW = wb.imageWidth - wb.padLeft - wb.padRight;
  const innerH = wb.imageHeight - wb.padTop - wb.padBottom;
  const relX = (px - wb.padLeft) / innerW;
  const relY = (pyFromTop - wb.padTop) / innerH;
  const x = wb.xMin + relX * (wb.xMax - wb.xMin);
  const y = wb.yFlipped ? wb.yMax - relY * (wb.yMax - wb.yMin) : wb.yMin + relY * (wb.yMax - wb.yMin);
  return { x, y };
}

export function gameToLatLng(wb: Waterbody, x: number, y: number) {
  const innerW = wb.imageWidth - wb.padLeft - wb.padRight;
  const innerH = wb.imageHeight - wb.padTop - wb.padBottom;
  const relX = (x - wb.xMin) / (wb.xMax - wb.xMin);
  const relY = wb.yFlipped
    ? (wb.yMax - y) / (wb.yMax - wb.yMin)
    : (y - wb.yMin) / (wb.yMax - wb.yMin);
  const px = wb.padLeft + relX * innerW;
  const pyFromTop = wb.padTop + relY * innerH;
  return L.latLng(wb.imageHeight - pyFromTop, px);
}

function MapSync({ wb }: { wb: Waterbody }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([0, 0], [wb.imageHeight, wb.imageWidth]);
    map.fitBounds(bounds);
    map.setMaxBounds(bounds.pad(0.08));
  }, [map, wb]);
  return null;
}

function FlyToPin({
  wb,
  marker,
}: {
  wb: Waterbody;
  marker: PostMarker | undefined;
}) {
  const map = useMap();
  const flyToId = useStore((s) => s.flyToId);
  const clearFlyTo = useStore((s) => s.clearFlyTo);
  useEffect(() => {
    if (!flyToId || !marker) return;
    map.panTo(gameToLatLng(wb, marker.coordX, marker.coordY));
    clearFlyTo();
  }, [map, wb, marker, flyToId, clearFlyTo]);
  return null;
}

function MapEvents({
  wb,
  rulerOn,
  onHover,
  onCreate,
  onRuler,
}: {
  wb: Waterbody;
  rulerOn: boolean;
  onHover: (c: { x: number; y: number } | null) => void;
  onCreate: (c: { x: number; y: number }) => void;
  onRuler: (pts: { x: number; y: number }[]) => void;
}) {
  const ptsRef = useRef<{ x: number; y: number }[]>([]);
  useMapEvents({
    mousemove(e) {
      onHover(pixelToGame(wb, e.latlng));
    },
    mouseout() {
      onHover(null);
    },
    contextmenu(e) {
      e.originalEvent.preventDefault();
      if (rulerOn) return;
      onCreate(pixelToGame(wb, e.latlng));
    },
    click(e) {
      if (!rulerOn) return;
      const p = pixelToGame(wb, e.latlng);
      const prev = ptsRef.current;
      const next = prev.length >= 2 ? [p] : [...prev, p];
      ptsRef.current = next;
      onRuler(next);
    },
  });
  useEffect(() => {
    if (!rulerOn) {
      ptsRef.current = [];
      onRuler([]);
    }
  }, [rulerOn, onRuler]);
  return null;
}

export function MapView({ onCreate }: Props) {
  const api = useStore((s) => s.api);
  const waterbodies = useStore((s) => s.waterbodies);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const markers = useStore((s) => s.markers);
  const selectedId = useStore((s) => s.selectedId);
  const selectPost = useStore((s) => s.selectPost);
  const rulerOn = useStore((s) => s.rulerOn);
  const wb = waterbodies.find((w) => w.id === waterbodyId);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [ruler, setRuler] = useState<{ x: number; y: number }[]>([]);

  const bounds = useMemo(
    () => (wb ? L.latLngBounds([0, 0], [wb.imageHeight, wb.imageWidth]) : null),
    [wb],
  );

  const flyMarker = markers.find((m) => m.id === selectedId);

  if (!wb || !bounds) return <div className="map-empty">Выберите водоём</div>;

  const dist =
    ruler.length === 2
      ? Math.hypot(ruler[1].x - ruler[0].x, ruler[1].y - ruler[0].y) * wb.metersPerCell
      : null;

  return (
    <div className="map-wrap">
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
        <FlyToPin wb={wb} marker={flyMarker} />
        <ImageOverlay url={api.fileUrl(wb.mapUrl)} bounds={bounds} />
        <MapEvents wb={wb} rulerOn={rulerOn} onHover={setHover} onCreate={onCreate} onRuler={setRuler} />
        {markers.map((p) => (
          <Marker
            key={p.id}
            position={gameToLatLng(wb, p.coordX, p.coordY)}
            icon={pin(p.id === selectedId, p.catchType)}
            eventHandlers={{ click: () => void selectPost(p.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {p.fishName} · {fmtCoord(p.coordX, p.coordY)}
            </Tooltip>
          </Marker>
        ))}
        {ruler.length === 2 && (
          <Polyline
            positions={[gameToLatLng(wb, ruler[0].x, ruler[0].y), gameToLatLng(wb, ruler[1].x, ruler[1].y)]}
            pathOptions={{ color: "#e8d7a3", weight: 2, dashArray: "6 4" }}
          />
        )}
      </MapContainer>
      <div className="map-hud">
        <span>{hover ? fmtCoord(hover.x, hover.y) : "—:—"}</span>
        {rulerOn && (
          <span className="gold">
            {dist != null ? `${Math.round(dist)} м` : "кликните две точки"}
          </span>
        )}
        {!rulerOn && <span className="muted">ПКМ — новый пост</span>}
      </div>
    </div>
  );
}
