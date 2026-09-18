export type EtagRecord<T> = {
  origin: string;
  etag: string | null;
  data: T;
};

export function normalizeOrigin(url: string) {
  return url.replace(/\/$/, "");
}

export function readEtagRecord<T>(key: string, origin: string, isData: (value: unknown) => value is T): EtagRecord<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EtagRecord<T>>;
    if (!parsed || parsed.origin !== origin || !isData(parsed.data)) return null;
    return { origin: parsed.origin, etag: parsed.etag ?? null, data: parsed.data };
  } catch {
    return null;
  }
}

export function writeEtagRecord<T>(key: string, origin: string, etag: string | null, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ origin, etag, data } satisfies EtagRecord<T>));
  } catch {
    /* quota / private mode */
  }
}

export async function loadWithEtag<T>(opts: {
  key: string;
  origin: string;
  etag: string | null | undefined;
  req: (etag?: string) => Promise<{ notModified: true } | { notModified: false; data: T; etag: string | null }>;
  isData: (value: unknown) => value is T;
  cached?: T;
}): Promise<T> {
  const result = await opts.req(opts.etag ?? undefined);
  if (result.notModified) {
    const cached = opts.cached ?? readEtagRecord(opts.key, opts.origin, opts.isData)?.data;
    if (cached) return cached;
  } else {
    writeEtagRecord(opts.key, opts.origin, result.etag, result.data);
    return result.data;
  }
  const again = await opts.req();
  if (again.notModified) throw new Error("Пустой ответ сервера");
  writeEtagRecord(opts.key, opts.origin, again.etag, again.data);
  return again.data;
}
