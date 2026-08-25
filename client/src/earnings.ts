export type OpKind = "in" | "out";

export type EarningsOp = {
  id: string;
  date: string;
  kind: OpKind;
  amount: string;
};

export type EarningsState = {
  cash: string;
  openings: Record<string, string>;
  operations: EarningsOp[];
};

export type EarningsTotals = {
  received: number;
  spent: number;
  net: number;
};

const LS_KEY = "rf4spots-earnings";

export function todayYmd(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyOp(kind: OpKind = "in", date = todayYmd()): EarningsOp {
  return {
    id: newId(),
    date,
    kind,
    amount: "",
  };
}

export function emptyEarnings(): EarningsState {
  return { cash: "", openings: {}, operations: [] };
}

export function loadEarnings(): EarningsState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyEarnings();
    const parsed = JSON.parse(raw) as {
      cash?: unknown;
      openings?: unknown;
      operations?: unknown;
      sessions?: unknown;
    };
    const cash = typeof parsed.cash === "string" ? parsed.cash : parsed.cash != null ? String(parsed.cash) : "";
    const openings =
      parsed.openings && typeof parsed.openings === "object" && !Array.isArray(parsed.openings)
        ? Object.fromEntries(
            Object.entries(parsed.openings as Record<string, unknown>).map(([key, value]) => [key, value == null ? "" : String(value)]),
          )
        : {};
    const operations = Array.isArray(parsed.operations)
      ? parsed.operations.map(normalizeOp).filter((row): row is EarningsOp => row != null)
      : Array.isArray(parsed.sessions)
        ? parsed.sessions.flatMap(sessionToOps)
        : [];
    return { cash, openings, operations };
  } catch {
    return emptyEarnings();
  }
}

export function saveEarnings(state: EarningsState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function parseAmount(text: string) {
  const t = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmtAmount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export function ymdDate(value: string, fallback = new Date()) {
  return parseYmd(value) ?? fallback;
}

export function balanceBefore(operations: EarningsOp[], date: string, opening = 0) {
  return opening + reduceOps(operations, (op) => Boolean(op.date && op.date < date)).net;
}

export function dayNet(operations: EarningsOp[], date: string) {
  return reduceOps(operations, (op) => op.date === date).net;
}

export function startOfDay(
  operations: EarningsOp[],
  openings: Record<string, string> | undefined,
  date: string,
  seed = 0,
) {
  const override = parseAmount(openings?.[date] ?? "");
  if (override != null) return override;
  const previous = Object.keys(openings ?? {})
    .filter((day) => day < date && parseAmount(openings?.[day] ?? "") != null)
    .sort()
    .at(-1);
  if (previous) {
    const base = parseAmount(openings?.[previous] ?? "") ?? 0;
    return base + reduceOps(operations, (op) => op.date >= previous && op.date < date).net;
  }
  return balanceBefore(operations, date, seed);
}

export function periodBounds(now = new Date()) {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    day: { start: dayStart, end: dayEnd },
    week: { start: weekStart, end: weekEnd },
    month: { start: monthStart, end: monthEnd },
  };
}

export function sumOps(operations: EarningsOp[], start: Date, end: Date): EarningsTotals {
  return reduceOps(operations, (op) => {
    const when = parseYmd(op.date);
    return Boolean(when && when >= start && when < end);
  });
}

export function sumAllOps(operations: EarningsOp[]): EarningsTotals {
  return reduceOps(operations, () => true);
}

export function fmtDayLabel(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

export function fmtWeekLabel(start: Date, end: Date) {
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  return `${fmtShort(start)}–${fmtShort(last)}`;
}

export function fmtMonthLabel(date: Date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function fmtShort(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

function reduceOps(operations: EarningsOp[] | undefined, include: (op: EarningsOp) => boolean): EarningsTotals {
  let received = 0;
  let spent = 0;
  for (const op of operations ?? []) {
    if (!include(op)) continue;
    const amount = parseAmount(op.amount) ?? 0;
    if (op.kind === "in") received += amount;
    else spent += amount;
  }
  return { received, spent, net: received - spent };
}

function parseYmd(value: string) {
  if (typeof value !== "string" || !value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function splitDateTime(value: string) {
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeOp(row: unknown): EarningsOp | null {
  if (!row || typeof row !== "object") return null;
  const s = row as Partial<EarningsOp>;
  const kind = s.kind === "out" ? "out" : s.kind === "in" ? "in" : null;
  if (!kind) return null;
  return {
    id: typeof s.id === "string" && s.id ? s.id : newId(),
    date: asStr(s.date) || todayYmd(),
    kind,
    amount: asStr(s.amount),
  };
}

function sessionToOps(row: unknown): EarningsOp[] {
  if (!row || typeof row !== "object") return [];
  const s = row as {
    id?: string;
    date?: string;
    from?: string;
    to?: string;
    earned?: string;
    spent?: string;
    amount?: string;
    kind?: string;
  };
  const migrated = normalizeOp(s);
  if (migrated) return [migrated];
  const date = asStr(s.date) || splitDateTime(asStr(s.from)) || splitDateTime(asStr(s.to)) || todayYmd();
  const ops: EarningsOp[] = [];
  if (asStr(s.earned)) ops.push({ id: newId(), date, kind: "in", amount: asStr(s.earned) });
  if (asStr(s.spent)) ops.push({ id: newId(), date, kind: "out", amount: asStr(s.spent) });
  return ops;
}

function asStr(value: unknown) {
  return value == null ? "" : String(value);
}
