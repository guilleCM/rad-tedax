import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  radiiFromAlertReading,
} from "./inverseSquare";

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters([-3.7, 40.4], [-3.7, 40.4])).toBe(0);
  });

  it("measures about 111 m per 0.001 degrees of latitude", () => {
    expect(distanceMeters([0, 0], [0, 0.001])).toBeCloseTo(111.2, 0);
  });
});

describe("radiiFromAlertReading", () => {
  it("places 5 mSv/h at the measured 100 µSv/h radius divided by sqrt(50)", () => {
    expect(radiiFromAlertReading(100)).toEqual({
      radiusZoneIMeters: 14,
      radiusZoneIIMeters: 100,
    });
  });

  it("rounds the measured radius to the nearest meter", () => {
    expect(radiiFromAlertReading(70.4)).toEqual({
      radiusZoneIMeters: 10,
      radiusZoneIIMeters: 70,
    });
  });

  it("rejects a reading on top of the source", () => {
    expect(radiiFromAlertReading(0.4)).toBeNull();
  });
});
