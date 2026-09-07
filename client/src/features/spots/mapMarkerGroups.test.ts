import { describe, expect, it } from "vitest";
import type { PostMarker } from "@/types";
import {
  coordKey,
  groupCatchType,
  groupMarkersByCoord,
  groupTooltip,
  postsLabel,
} from "./mapMarkerGroups";

function marker(partial: Partial<PostMarker> & Pick<PostMarker, "id">): PostMarker {
  return {
    coordX: 10,
    coordY: 20,
    catchType: "farm",
    fishName: "Плотва",
    ...partial,
  };
}

describe("mapMarkerGroups", () => {
  it("groups posts that round to the same 0.1 coordinate", () => {
    const groups = groupMarkersByCoord([
      marker({ id: "a", coordX: 12.41, coordY: 8.39 }),
      marker({ id: "b", coordX: 12.38, coordY: 8.42, fishName: "Лещ" }),
      marker({ id: "c", coordX: 12.46, coordY: 8.4 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe("12.4:8.4");
    expect(groups[0].posts.map((p) => p.id)).toEqual(["a", "b"]);
    expect(groups[1].key).toBe("12.5:8.4");
    expect(groups[1].posts.map((p) => p.id)).toEqual(["c"]);
  });

  it("builds a coord key with the same rounding as the form", () => {
    expect(coordKey(12.41, 8.39)).toBe("12.4:8.4");
  });

  it("prefers the selected catch type, otherwise trophy over farm", () => {
    const posts = [
      marker({ id: "a", catchType: "farm" }),
      marker({ id: "b", catchType: "trophy" }),
      marker({ id: "c", catchType: "farm_trophy" }),
    ];
    expect(groupCatchType(posts)).toBe("trophy");
    expect(groupCatchType(posts, "c")).toBe("farm_trophy");
  });

  it("labels stacked pins in Russian", () => {
    expect(postsLabel(1)).toBe("1 пост");
    expect(postsLabel(2)).toBe("2 поста");
    expect(postsLabel(5)).toBe("5 постов");
    expect(postsLabel(21)).toBe("21 пост");
  });

  it("summarizes a stack in the tooltip", () => {
    const [group] = groupMarkersByCoord([
      marker({ id: "a", fishName: "Плотва" }),
      marker({ id: "b", fishName: "Лещ" }),
      marker({ id: "c", fishName: "Карась" }),
    ]);
    expect(groupTooltip(group)).toBe("Плотва, Лещ и ещё 1 · 3 поста · 10:20");
  });
});
