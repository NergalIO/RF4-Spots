import { useEffect, useMemo, useRef } from "react";
import type { Screenshot } from "@/types";

export const MAX_SHOTS = 8;

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  existing?: Screenshot[];
  onRemoveExisting?: (id: string) => void;
  fileUrl?: (url: string) => string;
  onlyWhenFocused?: boolean;
};

const pasteStack: Array<(e: ClipboardEvent) => boolean> = [];

function dispatchPaste(e: ClipboardEvent) {
  for (let i = pasteStack.length - 1; i >= 0; i--) {
    if (pasteStack[i](e)) return;
  }
}

function namedImage(file: File): File {
  const type = file.type || "image/png";
  const ext = (type.split("/")[1] || "png").replace("jpeg", "jpg");
  if (file.name && /\.(png|jpe?g|webp|gif)$/i.test(file.name)) return file;
  return new File([file], `screenshot-${Date.now()}.${ext}`, { type, lastModified: Date.now() });
}

function imagesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const out: File[] = [];
  const seen = new Set<File>();
  for (const item of data.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file && !seen.has(file)) {
        seen.add(file);
        out.push(namedImage(file));
      }
    }
  }
  if (out.length) return out;
  for (const file of Array.from(data.files)) {
    if (file.type.startsWith("image/")) out.push(namedImage(file));
  }
  return out;
}

export function ShotPicker({
  files,
  onChange,
  existing = [],
  onRemoveExisting,
  fileUrl,
  onlyWhenFocused,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const existingRef = useRef(existing);
  existingRef.current = existing;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

  const used = existing.length + files.length;
  const full = used >= MAX_SHOTS;

  function addMany(list: Iterable<File> | FileList | null) {
    if (!list) return;
    const current = filesRef.current;
    let room = MAX_SHOTS - existingRef.current.length - current.length;
    if (room <= 0) return;
    const next = [...current];
    for (const raw of Array.from(list)) {
      if (room <= 0) break;
      if (!raw.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(raw.name)) continue;
      next.push(namedImage(raw));
      room -= 1;
    }
    if (next.length !== current.length) onChangeRef.current(next);
  }

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (onlyWhenFocused) {
        const active = document.activeElement;
        const scope = rootRef.current?.closest(".comment-form, .modal") ?? rootRef.current;
        if (scope && active && active !== document.body && !scope.contains(active)) return false;
      }
      const files = imagesFromClipboard(e.clipboardData);
      if (!files.length) return false;
      if (existingRef.current.length + filesRef.current.length >= MAX_SHOTS) return true;
      e.preventDefault();
      addMany(files);
      return true;
    };
    pasteStack.push(handler);
    if (pasteStack.length === 1) window.addEventListener("paste", dispatchPaste, true);
    return () => {
      const i = pasteStack.lastIndexOf(handler);
      if (i >= 0) pasteStack.splice(i, 1);
      if (pasteStack.length === 0) window.removeEventListener("paste", dispatchPaste, true);
    };
  }, []);

  return (
    <div className="shot-picker" ref={rootRef}>
      {(existing.length > 0 || files.length > 0) && (
        <div className={`thumbs shot-thumbs${existing.length + files.length > 4 ? " sm" : ""}`}>
          {existing.map((s) => (
            <div key={s.id} className="shot-thumb">
              <img src={fileUrl ? fileUrl(s.url) : s.url} alt="" />
              {onRemoveExisting && (
                <button
                  type="button"
                  className="shot-remove"
                  title="Удалить скриншот"
                  onClick={() => onRemoveExisting(s.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {previews.map((p, i) => (
            <div key={`${p.file.name}-${p.file.lastModified}-${i}`} className="shot-thumb">
              <img src={p.url} alt="" />
              <button
                type="button"
                className="shot-remove"
                title="Убрать"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className={`file-pick${full ? " disabled" : ""}`}>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={full}
          onChange={(e) => {
            addMany(e.target.files);
            e.target.value = "";
          }}
        />
        <span>{full ? `Максимум ${MAX_SHOTS} скриншотов` : "Добавить скриншоты"}</span>
      </label>
      <p className="shot-hint">Несколько файлов сразу или Ctrl+V</p>
    </div>
  );
}
