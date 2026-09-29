import { describe, expect, it } from "vitest";
import {
  isFarEnough,
  lngLatsFromSketches,
  sketchesFromOverrides,
  sketchPolylinePoints,
} from "@/lib/map/sketches";

describe("sketchesFromOverrides", () => {
  it("keeps strokes with a known color and at least two points", () => {
    expect(
      sketchesFromOverrides({
        sketches: [
          {
            id: "a",
            color: "yellow",
            coordinates: [
              [2, 41],
              [2.001, 41.001],
            ],
          },
          {
            id: "short",
            color: "black",
            coordinates: [[2, 41]],
          },
        ],
      }),
    ).toEqual([
      {
        id: "a",
        color: "yellow",
        coordinates: [
          [2, 41],
          [2.001, 41.001],
        ],
      },
    ]);
  });

  it("reads an older blue stroke as black", () => {
    expect(
      sketchesFromOverrides({
        sketches: [
          {
            id: "legacy",
            color: "blue" as "black",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        ],
      }),
    ).toEqual([
      {
        id: "legacy",
        color: "black",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    ]);
  });

  it("drops an unknown color", () => {
    expect(
      sketchesFromOverrides({
        sketches: [
          {
            id: "bad",
            color: "red" as "yellow",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        ],
      }),
    ).toEqual([]);
  });
});

describe("lngLatsFromSketches", () => {
  it("flattens every stroke", () => {
    expect(
      lngLatsFromSketches([
        {
          id: "a",
          color: "white",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      ]),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});

describe("isFarEnough", () => {
  it("accepts the first point and rejects a tiny step", () => {
    expect(isFarEnough(null, { x: 0, y: 0 })).toBe(true);
    expect(isFarEnough({ x: 0, y: 0 }, { x: 1, y: 1 }, 4)).toBe(false);
    expect(isFarEnough({ x: 0, y: 0 }, { x: 5, y: 0 }, 4)).toBe(true);
  });
});

describe("sketchPolylinePoints", () => {
  it("projects coordinates into an SVG points string", () => {
    expect(
      sketchPolylinePoints(
        [
          [0, 0],
          [1, 1],
        ],
        ([lng, lat]) => ({ x: lng * 10, y: lat * 10 }),
      ),
    ).toBe("0,0 10,10");
  });
});
