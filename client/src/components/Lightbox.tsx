import { useEffect } from "react";
import { useStore } from "../store";
import type { Screenshot } from "../types";

type Props = {
  shots: Screenshot[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
};

export function Lightbox({ shots, index, onClose, onIndex }: Props) {
  const api = useStore((s) => s.api);
  const shot = shots[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % shots.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + shots.length) % shots.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, shots.length, onClose, onIndex]);

  if (!shot) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <button
        type="button"
        className="nav prev"
        onClick={(e) => {
          e.stopPropagation();
          onIndex((index - 1 + shots.length) % shots.length);
        }}
      >
        ‹
      </button>
      <img src={api.fileUrl(shot.url)} alt="" onClick={(e) => e.stopPropagation()} />
      <button
        type="button"
        className="nav next"
        onClick={(e) => {
          e.stopPropagation();
          onIndex((index + 1) % shots.length);
        }}
      >
        ›
      </button>
      <span className="counter">
        {index + 1} / {shots.length}
      </span>
    </div>
  );
}
