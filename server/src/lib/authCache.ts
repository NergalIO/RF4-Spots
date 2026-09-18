import { prisma } from "./prisma.js";

export const AUTH_CACHE_TTL_MS = 45_000;
export const PRESENCE_WRITE_MS = 45_000;

export type CachedUser = {
  id: string;
  nickname: string;
  role: "player" | "admin";
  tokenVersion: number;
  disabledAt: Date | null;
  feedSeededAt: Date | null;
  at: number;
};

const cache = new Map<string, CachedUser>();
const lastSeenWrite = new Map<string, number>();

function toCached(user: {
  id: string;
  nickname: string;
  role: "player" | "admin";
  tokenVersion: number;
  disabledAt: Date | null;
  feedSeededAt: Date | null;
}): CachedUser {
  return {
    id: user.id,
    nickname: user.nickname,
    role: user.role,
    tokenVersion: user.tokenVersion,
    disabledAt: user.disabledAt,
    feedSeededAt: user.feedSeededAt,
    at: Date.now(),
  };
}

export function rememberUser(user: {
  id: string;
  nickname: string;
  role: "player" | "admin";
  tokenVersion: number;
  disabledAt: Date | null;
  feedSeededAt: Date | null;
}) {
  cache.set(user.id, toCached(user));
}

export function patchCachedUser(userId: string, patch: Partial<Omit<CachedUser, "id" | "at">>) {
  const hit = cache.get(userId);
  if (!hit) return;
  cache.set(userId, { ...hit, ...patch });
}

export function invalidateUser(userId: string) {
  cache.delete(userId);
  lastSeenWrite.delete(userId);
}

export async function loadCachedUser(userId: string): Promise<CachedUser | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < AUTH_CACHE_TTL_MS) return hit;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      role: true,
      tokenVersion: true,
      disabledAt: true,
      feedSeededAt: true,
    },
  });
  if (!user) {
    cache.delete(userId);
    return null;
  }
  const entry = toCached(user);
  cache.set(userId, entry);
  return entry;
}

export function notePresence(userId: string) {
  const prev = lastSeenWrite.get(userId) ?? 0;
  if (Date.now() - prev < PRESENCE_WRITE_MS) return;
  lastSeenWrite.set(userId, Date.now());
  void prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
}
