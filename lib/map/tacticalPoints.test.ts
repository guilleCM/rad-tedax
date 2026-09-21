import { describe, expect, it } from "vitest";
import {
  emptyTacticalPointCoordinates,
  lngLatsFromTacticalPoints,
  tacticalPointsFromOverrides,
  tacticalPointsToOverridePayload,
} from "./tacticalPoints";

describe("tacticalPoints", () => {
  it("reads coordinates from manual overrides", () => {
    expect(
      tacticalPointsFromOverrides({
        controlPoint: { type: "Point", coordinates: [2.17, 41.38] },
        entryExit: { type: "Point", coordinates: [2.18, 41.39] },
      }),
    ).toEqual({
      controlPoint: [2.17, 41.38],
      decontaminationStation: null,
      advancedCommandPost: null,
      entryExit: [2.18, 41.39],
    });
  });

  it("serializes placed points and omits empty ones as null", () => {
    const points = emptyTacticalPointCoordinates();
    points.decontaminationStation = [1, 2];

    expect(tacticalPointsToOverridePayload(points)).toEqual({
      controlPoint: null,
      decontaminationStation: { type: "Point", coordinates: [1, 2] },
      advancedCommandPost: null,
      entryExit: null,
    });
  });

  it("collects only placed lng/lat pairs", () => {
    expect(
      lngLatsFromTacticalPoints({
        controlPoint: [0, 0],
        decontaminationStation: null,
        advancedCommandPost: [1, 1],
        entryExit: null,
      }),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});
