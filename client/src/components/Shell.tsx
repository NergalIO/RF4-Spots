import { useState } from "react";
import { MapView } from "./MapView";
import { PostDetail } from "./PostDetail";
import { PostForm } from "./PostForm";
import { PostList } from "./PostList";
import { Lightbox } from "./Lightbox";
import { useStore } from "../store";
import type { Post, Screenshot } from "../types";

export function Shell() {
  const user = useStore((s) => s.user);
  const waterbodies = useStore((s) => s.waterbodies);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const setWaterbody = useStore((s) => s.setWaterbody);
  const rulerOn = useStore((s) => s.rulerOn);
  const toggleRuler = useStore((s) => s.toggleRuler);
  const logout = useStore((s) => s.logout);
  const detail = useStore((s) => s.detail);
  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null);
  const [edit, setEdit] = useState<Post | null>(null);
  const [lb, setLb] = useState<{ shots: Screenshot[]; index: number } | null>(null);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">RF4</span>
          <div>
            <strong>Spots</strong>
            <small>точки ловли</small>
          </div>
        </div>
        <label className="wb-select">
          Водоём
          <select value={waterbodyId} onChange={(e) => void setWaterbody(e.target.value)}>
            {waterbodies.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={`btn ghost ${rulerOn ? "on" : ""}`} onClick={toggleRuler}>
          Линейка
        </button>
        <div className="spacer" />
        <span className={`role-pill ${user?.role}`}>
          {user?.nickname} · {user?.role === "admin" ? "админ" : "игрок"}
        </span>
        <button type="button" className="btn ghost" onClick={() => void logout()}>
          Выход
        </button>
      </header>
      <div className="workspace">
        <PostList />
        <MapView onCreate={setCreateAt} />
        <PostDetail
          onEdit={() => detail && setEdit(detail)}
          onOpenShots={(shots, index) => setLb({ shots, index })}
        />
      </div>
      {createAt && <PostForm coords={createAt} onClose={() => setCreateAt(null)} />}
      {edit && (
        <PostForm
          coords={{ x: edit.coordX, y: edit.coordY }}
          post={edit}
          onClose={() => setEdit(null)}
        />
      )}
      {lb && (
        <Lightbox
          shots={lb.shots}
          index={lb.index}
          onClose={() => setLb(null)}
          onIndex={(index) => setLb({ ...lb, index })}
        />
      )}
    </div>
  );
}
