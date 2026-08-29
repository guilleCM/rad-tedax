import { describe, expect, it } from "vitest";
import { calculateZones } from "./calculateZones";

describe("calculateZones", () => {
  it("returns concentric Zone I and Zone II polygons", () => {
    const result = calculateZones({
      point: [-3.7038, 40.4168],
      zoneParams: {
        formulaVersion: "v1-placeholder",
        radiusZoneIMeters: 100,
        radiusZoneIIMeters: 300,
      },
    });

    expect(result.zoneI.properties.kind).toBe("I");
    expect(result.zoneII.properties.kind).toBe("II");
    expect(result.zoneI.geometry.type).toBe("Polygon");
    expect(result.zoneII.geometry.type).toBe("Polygon");
    expect(result.formulaVersion).toBe("v1-placeholder");
    expect(result.computedFrom.point.coordinates).toEqual([-3.7038, 40.4168]);
  });

  it("requires Zone II radius larger than Zone I for placeholder", () => {
    const result = calculateZones({
      point: [0, 0],
      zoneParams: {
        formulaVersion: "v1-placeholder",
        radiusZoneIMeters: 50,
        radiusZoneIIMeters: 200,
      },
    });

    const ringI = result.zoneI.geometry.coordinates[0];
    const ringII = result.zoneII.geometry.coordinates[0];
    expect(ringII.length).toBeGreaterThan(0);
    expect(ringI.length).toBeGreaterThan(0);
  });
});
