import { describe, expect, it } from "vitest";
import { getMapCssDimensions } from "./interventionMapShared";

describe("getMapCssDimensions", () => {
  it("returns CSS dimensions from the map canvas, not physical pixels", () => {
    const map = {
      getCanvas: () => ({
        clientWidth: 800,
        clientHeight: 450,
        width: 1600,
        height: 900,
      }),
    };

    expect(getMapCssDimensions(map as never)).toEqual({
      width: 800,
      height: 450,
    });
  });

  it("returns zero dimensions when the canvas has no layout size", () => {
    const map = {
      getCanvas: () => ({
        clientWidth: 0,
        clientHeight: 0,
        width: 0,
        height: 0,
      }),
    };

    expect(getMapCssDimensions(map as never)).toEqual({
      width: 0,
      height: 0,
    });
  });
});
