import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
};

export function ValueCombobox({
  options,
  value,
  onChange,
  placeholder = "Все значения",
  emptyLabel = "Все значения",
}: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const selected = value ? options.find((item) => item === value) : "";

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query ? options.filter((item) => item.toLowerCase().includes(query)) : options;
    return list.slice(0, 80);
  }, [options, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) setQ("");
  }, [open, value]);

  return (
    <div className="combo" ref={box}>
      <input
        className="combo-input"
        value={open ? q : selected ?? ""}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQ("");
          setHi(0);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((i) => Math.min(i + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = shown[hi];
            if (pick) {
              onChange(pick);
              setOpen(false);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Backspace" && !open && value) {
            onChange("");
          }
        }}
      />
      {value && !open && (
        <button type="button" className="combo-clear" onClick={() => onChange("")} aria-label="Сбросить">
          ×
        </button>
      )}
      {open && (
        <ul className="combo-list">
          <li>
            <button
              type="button"
              className={hi === -1 ? "active" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
                setOpen(false);
              }}
            >
              {emptyLabel}
            </button>
          </li>
          {shown.length === 0 && <li className="combo-empty">Ничего не найдено</li>}
          {shown.map((item, i) => (
            <li key={item}>
              <button
                type="button"
                className={i === hi ? "active" : ""}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(item);
                  setOpen(false);
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
