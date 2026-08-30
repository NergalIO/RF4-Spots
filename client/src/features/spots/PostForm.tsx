import { FormEvent, useState } from "react";
import { CATCH_LABEL, fmtCoord, roundCoord } from "@/shared/format";
import { toDatetimeLocal } from "@/time";
import type { CatchType, Post } from "@/types";
import { FishCombobox } from "@/shared/ui/FishCombobox";
import { ShotPicker } from "./ShotPicker";
import { useStore } from "@/store";

type Props = {
  coords: { x: number; y: number };
  post?: Post | null;
  onClose: () => void;
};

export function PostForm({ coords, post, onClose }: Props) {
  const fish = useStore((s) => s.fish);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const api = useStore((s) => s.api);
  const refreshPosts = useStore((s) => s.refreshPosts);
  const refreshMarkers = useStore((s) => s.refreshMarkers);
  const selectPost = useStore((s) => s.selectPost);
  const [fishId, setFishId] = useState(post?.fish.id ?? "");
  const [catchType, setCatchType] = useState<CatchType>(post?.catchType ?? "farm");
  const [catchDate, setCatchDate] = useState(() => toDatetimeLocal(post?.catchDate || new Date().toISOString()));
  const [comment, setComment] = useState(post?.comment ?? "");
  const [coordX, setCoordX] = useState(String(roundCoord(post?.coordX ?? coords.x)));
  const [coordY, setCoordY] = useState(String(roundCoord(post?.coordY ?? coords.y)));
  const [files, setFiles] = useState<File[]>([]);
  const [keepIds, setKeepIds] = useState<string[]>(post?.screenshots.map((s) => s.id) ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const kept = post?.screenshots.filter((s) => keepIds.includes(s.id)) ?? [];
  const xNum = roundCoord(Number(coordX.replace(",", ".")));
  const yNum = roundCoord(Number(coordY.replace(",", ".")));

  async function copyCoords() {
    try {
      await navigator.clipboard.writeText(fmtCoord(xNum, yNum));
    } catch {
      /* ignore */
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fishId) {
      setError("Выберите вид рыбы из списка");
      return;
    }
    if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) {
      setError("Некорректные координаты");
      return;
    }
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("waterbodyId", post?.waterbody.id ?? waterbodyId);
    fd.set("fishId", fishId);
    fd.set("coordX", String(xNum));
    fd.set("coordY", String(yNum));
    fd.set("catchType", catchType);
    fd.set("catchDate", new Date(catchDate).toISOString());
    fd.set("comment", comment);
    for (const f of files) fd.append("screenshots", f);
    if (post) fd.set("keepScreenshots", JSON.stringify(keepIds));
    try {
      const res = post ? await api.updatePost(post.id, fd) : await api.createPost(fd);
      await refreshPosts();
      await refreshMarkers();
      await selectPost(res.post.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2>{post ? "Редактировать пост" : "Новый пост"}</h2>
        <div className="coord-row">
          <label>
            X
            <input value={coordX} onChange={(e) => setCoordX(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Y
            <input value={coordY} onChange={(e) => setCoordY(e.target.value)} inputMode="decimal" />
          </label>
        </div>
        <label>
          Вид рыбы
          <FishCombobox fish={fish} value={fishId} onChange={setFishId} waterbodyId={waterbodyId} />
        </label>
        <fieldset className="type-row">
          <legend>Тип улова</legend>
          {(Object.keys(CATCH_LABEL) as CatchType[]).map((k) => (
            <label key={k} className="chip">
              <input
                type="radio"
                name="catchType"
                checked={catchType === k}
                onChange={() => setCatchType(k)}
              />
              {CATCH_LABEL[k]}
            </label>
          ))}
        </fieldset>
        <label>
          Дата поимки
          <input type="datetime-local" value={catchDate} onChange={(e) => setCatchDate(e.target.value)} required />
        </label>
        <div className="field">
          <span className="field-label">Комментарий</span>
          <ShotPicker
            files={files}
            onChange={setFiles}
            existing={kept}
            onRemoveExisting={(id) => setKeepIds((ids) => ids.filter((x) => x !== id))}
            fileUrl={(url) => api.fileUrl(url)}
          >
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </ShotPicker>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" disabled={busy} type="submit">
            {busy ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
