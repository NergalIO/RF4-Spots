export function fmtDay(ymd: string) {
  const parts = ymd.split("-");
  return `${parts[2]}.${parts[1]}`;
}

export function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ru-RU", { month: "short" });
}

export function cmpHint(now: number, prev: number, vs: string) {
  const d = now - prev;
  if (d === 0) return `как ${vs}`;
  return `${d > 0 ? `+${d}` : d} к ${vs}`;
}
