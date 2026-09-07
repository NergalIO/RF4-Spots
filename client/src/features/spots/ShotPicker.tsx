import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Screenshot } from "@/types";
import {
  imagesFromClipboard,
  isImageFile,
  MAX_SHOTS,
  namedImage,
  popPasteHandler,
  pushPasteHandler,
} from "./shotPickerClipboard";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  existing?: Screenshot[];
  onRemoveExisting?: (id: string) => void;
  fileUrl?: (url: string) => string;
  onlyWhenFocused?: boolean;
  children?: ReactNode;
};

export { MAX_SHOTS };

export function ShotPicker({
  files,
  onChange,
  existing = [],
  onRemoveExisting,
  fileUrl,
  onlyWhenFocused,
  children,
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
      if (!isImageFile(raw)) continue;
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
      const pasted = imagesFromClipboard(e.clipboardData);
      if (!pasted.length) return false;
      if (existingRef.current.length + filesRef.current.length >= MAX_SHOTS) return true;
      e.preventDefault();
      addMany(pasted);
      return true;
    };
    pushPasteHandler(handler);
    return () => popPasteHandler(handler);
  }, [onlyWhenFocused]);

  return (
    <div className="shot-picker" ref={rootRef}>
      {(existing.length > 0 || files.length > 0) && (
        <div className={`thumbs shot-thumbs${existing.length + files.length > 4 ? " sm" : ""}`}>
          {existing.map((s) => (
            <div key={s.id} className="shot-thumb">
              <img src={fileUrl ? fileUrl(s.url) : s.url} alt="" />
              {onRemoveExisting && (
                <button type="button" className="shot-remove" title="Удалить скриншот" onClick={() => onRemoveExisting(s.id)}>
                  ×
                </button>
              )}
            </div>
          ))}
          {previews.map((p, i) => (
            <div key={`${p.file.name}-${p.file.lastModified}-${i}`} className="shot-thumb">
              <img src={p.url} alt="" />
              <button type="button" className="shot-remove" title="Убрать" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="composer-row">
        <label className={`file-pick${full ? " disabled" : ""}`} title={full ? `Максимум ${MAX_SHOTS} скриншотов` : "Прикрепить скриншоты"}>
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
          <span className="file-pick-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M16.5 6.5v8.2a4.5 4.5 0 1 1-9 0V6.2a3.2 3.2 0 1 1 6.4 0v8.1a1.9 1.9 0 1 1-3.8 0V7.2h1.5v7.1a.4.4 0 0 0 .8 0V6.2a1.7 1.7 0 1 0-3.4 0v8.5a3 3 0 0 0 6 0V6.5h1.5Z"
              />
            </svg>
          </span>
        </label>
        {children}
      </div>
    </div>
  );
}
