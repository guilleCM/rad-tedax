import { describe, expect, it } from "vitest";
import { parseLatLng } from "@/lib/map/parseMapQuery";

describe("parseLatLng", () => {
  it("returns MapLibre [lng, lat] for valid numbers", () => {
    expect(parseLatLng("40.4168", "-3.7038")).toEqual([-3.7038, 40.4168]);
    expect(parseLatLng("39,5", "2,65")).toEqual([2.65, 39.5]);
  });

  it("accepts longitude outside ±90 when still within ±180", () => {
    expect(parseLatLng("37.2", "-120.5")).toEqual([-120.5, 37.2]);
  });

  it("returns null when a value is missing or out of range", () => {
    expect(parseLatLng("", "-3.7")).toBeNull();
    expect(parseLatLng("40", "")).toBeNull();
    expect(parseLatLng("91", "0")).toBeNull();
    expect(parseLatLng("0", "181")).toBeNull();
    expect(parseLatLng("Calle", "Mayor")).toBeNull();
    expect(parseLatLng("40abc", "0")).toBeNull();
  });
});
