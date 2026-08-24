import { useEffect, useMemo, useRef, useState } from "react";
import type { Fish } from "../types";

type Props = {
  fish: Fish[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  waterbodyId?: string;
};

export function FishCombobox({ fish, value, onChange, placeholder = "Вид рыбы", allowEmpty, waterbodyId }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const selected = fish.find((f) => f.id === value);

  const options = useMemo(() => {
    const query = q.trim().toLowerCase();
    const ranked = [...fish].sort((a, b) => {
      const aw = waterbodyId && a.waterbodies.includes(waterbodyId) ? 0 : 1;
      const bw = waterbodyId && b.waterbodies.includes(waterbodyId) ? 0 : 1;
      return aw - bw || a.name.localeCompare(b.name, "ru");
    });
    if (!query) return ranked.slice(0, 80);
    return ranked.filter((f) => f.name.toLowerCase().includes(query)).slice(0, 80);
  }, [fish, q, waterbodyId]);

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
        value={open ? q : selected?.name ?? ""}
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
            setHi((i) => Math.min(i + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = options[hi];
            if (pick) {
              onChange(pick.id);
              setOpen(false);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Backspace" && !open && value && allowEmpty) {
            onChange("");
          }
        }}
      />
      {value && allowEmpty && !open && (
        <button
          type="button"
          className="combo-clear"
          onClick={() => onChange("")}
          aria-label="Сбросить"
        >
          ×
        </button>
      )}
      {open && (
        <ul className="combo-list">
          {allowEmpty && (
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
                Все виды
              </button>
            </li>
          )}
          {options.length === 0 && <li className="combo-empty">Ничего не найдено</li>}
          {options.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                className={i === hi ? "active" : ""}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(f.id);
                  setOpen(false);
                }}
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
