const TZ = "Europe/Moscow";

export function ymdInTz(d: Date, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function startOfMoscowDay(offsetDays = 0) {
  const ymd = ymdInTz(new Date());
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d - offsetDays, 0, 0, 0) - 3 * 60 * 60 * 1000;
  return new Date(utc);
}

export function startOfMoscowMonth(offsetMonths = 0) {
  const ymd = ymdInTz(new Date());
  const [y, m] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + offsetMonths, 1, 0, 0, 0) - 3 * 60 * 60 * 1000);
}

export function fillDays(rows: { date: string; count: number }[], length: number) {
  const map = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const out: { date: string; count: number }[] = [];
  for (let i = length - 1; i >= 0; i--) {
    const key = ymdInTz(new Date(Date.now() - i * 86400000));
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  return out;
}

export function fillMonthRange(rows: { date: string; count: number }[], length: number) {
  const map = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const out: { date: string; count: number }[] = [];
  const ymd = ymdInTz(new Date());
  let [y, m] = ymd.split("-").map(Number);
  for (let i = 0; i < length; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.unshift({ date: key, count: map.get(key) ?? 0 });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}
