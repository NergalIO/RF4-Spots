const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ruPlural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (d === 1) return one;
  if (d >= 2 && d <= 4) return few;
  return many;
}

export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

export function fmtWhen(iso: string, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = now.getTime() - d.getTime();
  if (diff < 0) return fmtDateTime(iso);
  if (diff < 45_000) return "только что";
  if (diff < DAY) {
    if (diff < HOUR) {
      const min = Math.max(1, Math.round(diff / MINUTE));
      if (min === 1) return "минуту назад";
      return `${min} ${ruPlural(min, "минуту", "минуты", "минут")} назад`;
    }
    const hr = Math.max(1, Math.round(diff / HOUR));
    if (hr === 1) return "час назад";
    return `${hr} ${ruPlural(hr, "час", "часа", "часов")} назад`;
  }
  return fmtDateTime(iso);
}

export function toDatetimeLocal(iso: string, fallback = new Date()) {
  const d = new Date(iso);
  const src = Number.isNaN(d.getTime()) ? fallback : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${src.getFullYear()}-${pad(src.getMonth() + 1)}-${pad(src.getDate())}T${pad(src.getHours())}:${pad(src.getMinutes())}`;
}
