import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { PostMarker, Waterbody } from "@/types";
import { useStore } from "@/store";
import { gameToLatLng, pixelToGame } from "./mapCoords";

export function MapSync({ wb }: { wb: Waterbody }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([0, 0], [wb.imageHeight, wb.imageWidth]);
    map.setMaxBounds(bounds.pad(0.08));
    let fitted = false;
    const sync = () => {
      const box = map.getContainer();
      if (!box.clientWidth || !box.clientHeight) return;
      map.invalidateSize({ animate: false });
      if (!fitted) {
        fitted = true;
        map.fitBounds(bounds);
      }
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, wb]);
  return null;
}

export function FlyToPin({ wb, markers }: { wb: Waterbody; markers: PostMarker[] }) {
  const map = useMap();
  const flyToId = useStore((s) => s.flyToId);
  const clearFlyTo = useStore((s) => s.clearFlyTo);
  useEffect(() => {
    if (!flyToId || !markers.length) return;
    const target = markers.find((m) => m.id === flyToId);
    if (target) {
      const { lat, lng } = gameToLatLng(wb, target.coordX, target.coordY);
      map.panTo([lat, lng]);
    }
    clearFlyTo();
  }, [map, wb, markers, flyToId, clearFlyTo]);
  return null;
}

export function CenterTracker({
  wb,
  onChange,
}: {
  wb: Waterbody;
  onChange: (c: { x: number; y: number }) => void;
}) {
  const map = useMapEvents({
    move() {
      onChange(pixelToGame(wb, map.getCenter()));
    },
  });
  useEffect(() => {
    onChange(pixelToGame(wb, map.getCenter()));
  }, [map, wb, onChange]);
  return null;
}

export function MapEvents({
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
