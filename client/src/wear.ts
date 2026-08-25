export function remainBase(maxKg: number, wearPct: number) {
  const wear = Math.min(100, Math.max(0, wearPct));
  return maxKg * 0.3 + maxKg * 0.7 * (1 - wear / 100);
}

export function remainLinear(maxKg: number, wearPct: number) {
  const wear = Math.min(100, Math.max(0, wearPct));
  return maxKg * (1 - wear / 100);
}

/** Max wear % so stock strength does not fall below the weakest other part. */
export function maxWearUntil(maxKg: number, targetKg: number) {
  if (!(maxKg > 0) || !Number.isFinite(targetKg)) return null;
  if (targetKg <= 0) return 100;
  if (targetKg >= maxKg) return 0;
  return Math.min(100, Math.max(0, 100 * (1 - targetKg / maxKg)));
}

export function convertRetrieve(speed1: number, retrieve1: number, retrieve2: number) {
  if (!retrieve1 || !retrieve2) return null;
  return speed1 * (retrieve1 / retrieve2);
}

export function fmtKg(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} кг`;
}

export function fmtPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return `${text}%`;
}
