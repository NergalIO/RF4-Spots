import { describe, expect, it } from "vitest";
import type { Waterbody } from "@/types";
import { gameToLatLng, pixelToGame } from "./mapCoords";

const wb: Waterbody = {
  id: "test",
  name: "Test",
  metersPerCell: 10,
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 50,
  yFlipped: false,
  imageFile: "t.png",
  imageWidth: 200,
  imageHeight: 100,
  padLeft: 0,
  padTop: 0,
  padRight: 0,
  padBottom: 0,
  cellPx: 1,
  rf4mapLocationId: null,
  sortOrder: 0,
  mapUrl: "/maps/t.png",
};

describe("mapCoords", () => {
  it("round-trips game coordinates through pixel space", () => {
    const latlng = gameToLatLng(wb, 25, 10);
    expect(latlng).toEqual({ lat: 80, lng: 50 });
    expect(pixelToGame(wb, latlng)).toEqual({ x: 25, y: 10 });
  });

  it("flips Y when the waterbody is inverted", () => {
    const flipped = { ...wb, yFlipped: true };
    const latlng = gameToLatLng(flipped, 0, 50);
    expect(pixelToGame(flipped, latlng)).toEqual({ x: 0, y: 50 });
  });
});
