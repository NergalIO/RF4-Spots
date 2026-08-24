import { FormEvent, useState } from "react";
import { CATCH_LABEL, fmtCoord } from "../api";
import type { CatchType, Post } from "../types";
import { FishCombobox } from "./FishCombobox";
import { useStore } from "../store";

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
  const selectPost = useStore((s) => s.selectPost);
  const [fishId, setFishId] = useState(post?.fish.id ?? "");
  const [catchType, setCatchType] = useState<CatchType>(post?.catchType ?? "farm");
  const [catchDate, setCatchDate] = useState(
    (post?.catchDate || new Date().toISOString()).slice(0, 10),
  );
  const [comment, setComment] = useState(post?.comment ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fishId) {
      setError("Выберите вид рыбы из списка");
      return;
    }
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("waterbodyId", post?.waterbody.id ?? waterbodyId);
    fd.set("fishId", fishId);
    fd.set("coordX", String(post?.coordX ?? coords.x));
    fd.set("coordY", String(post?.coordY ?? coords.y));
    fd.set("catchType", catchType);
    fd.set("catchDate", catchDate);
    fd.set("comment", comment);
    for (const f of files) fd.append("screenshots", f);
    if (post) fd.set("keepScreenshots", JSON.stringify(post.screenshots.map((s) => s.id)));
    try {
      const res = post ? await api.updatePost(post.id, fd) : await api.createPost(fd);
      await refreshPosts();
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
        <p className="muted">Точка {fmtCoord(post?.coordX ?? coords.x, post?.coordY ?? coords.y)}</p>
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
          <input type="date" value={catchDate} onChange={(e) => setCatchDate(e.target.value)} required />
        </label>
        <label>
          Комментарий
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <label>
          Скриншоты
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 8))}
          />
        </label>
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
