import { useEffect, useState } from "react";

export function readPersistedTab<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  migrate?: (raw: string) => T | undefined,
): T {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const migrated = migrate?.(v);
    if (migrated && (allowed as readonly string[]).includes(migrated)) return migrated;
    if ((allowed as readonly string[]).includes(v)) return v as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function usePersistedTab<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  migrate?: (raw: string) => T | undefined,
) {
  const [tab, setTab] = useState(() => readPersistedTab(key, allowed, fallback, migrate));
  useEffect(() => {
    try {
      localStorage.setItem(key, tab);
    } catch {
      /* ignore */
    }
  }, [key, tab]);
  return [tab, setTab] as const;
}
