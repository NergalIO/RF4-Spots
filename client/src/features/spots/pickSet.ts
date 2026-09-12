export function nextPickedIds(
  orderedIds: string[],
  current: Iterable<string>,
  clickedId: string,
  shift: boolean,
  anchorId: string | null,
): { next: string[]; anchor: string } {
  const set = new Set(current);
  const selecting = !set.has(clickedId);
  if (shift && anchorId && orderedIds.includes(anchorId) && orderedIds.includes(clickedId)) {
    const a = orderedIds.indexOf(anchorId);
    const b = orderedIds.indexOf(clickedId);
    const [from, to] = a <= b ? [a, b] : [b, a];
    for (const id of orderedIds.slice(from, to + 1)) {
      if (selecting) set.add(id);
      else set.delete(id);
    }
  } else if (selecting) {
    set.add(clickedId);
  } else {
    set.delete(clickedId);
  }
  return { next: [...set], anchor: clickedId };
}

export function ruPosts(n: number) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "пост";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "поста";
  return "постов";
}
