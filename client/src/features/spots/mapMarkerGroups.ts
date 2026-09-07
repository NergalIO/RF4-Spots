import { roundCoord } from "@/shared/format";
import type { CatchType, PostMarker } from "@/types";

export type MarkerGroup = {
  key: string;
  coordX: number;
  coordY: number;
  posts: PostMarker[];
};

const CATCH_RANK: Record<CatchType, number> = {
  farm: 0,
  farm_trophy: 1,
  trophy: 2,
};

export function coordKey(x: number, y: number) {
  return `${roundCoord(x)}:${roundCoord(y)}`;
}

export function groupMarkersByCoord(markers: PostMarker[]): MarkerGroup[] {
  const groups = new Map<string, MarkerGroup>();
  for (const marker of markers) {
    const coordX = roundCoord(marker.coordX);
    const coordY = roundCoord(marker.coordY);
    const key = `${coordX}:${coordY}`;
    const group = groups.get(key);
    if (group) group.posts.push(marker);
    else groups.set(key, { key, coordX, coordY, posts: [marker] });
  }
  return [...groups.values()];
}

export function groupCatchType(posts: PostMarker[], selectedId?: string | null): CatchType {
  const selected = selectedId ? posts.find((p) => p.id === selectedId) : undefined;
  if (selected) return selected.catchType;
  return posts.reduce((best, p) => (CATCH_RANK[p.catchType] > CATCH_RANK[best] ? p.catchType : best), posts[0].catchType);
}

export function postsLabel(n: number) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} пост`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${n} поста`;
  return `${n} постов`;
}

export function groupTooltip(group: MarkerGroup) {
  const coord = `${group.coordX}:${group.coordY}`;
  if (group.posts.length === 1) return `${group.posts[0].fishName} · ${coord}`;
  const names = [...new Set(group.posts.map((p) => p.fishName))];
  const head = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? ` и ещё ${names.length - 2}` : "";
  return `${head}${extra} · ${postsLabel(group.posts.length)} · ${coord}`;
}
