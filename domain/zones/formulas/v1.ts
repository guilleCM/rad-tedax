import circle from "@turf/circle";
import { point } from "@turf/helpers";
import type { ZoneFeature, ZoneInput, ZoneResult } from "../types";

/**
 * Placeholder formula: concentric circles around the selected point.
 * Replace with the definitive radiological formula when available.
 */
export function calculateZonesV1(input: ZoneInput): ZoneResult {
  const { point: coordinates, zoneParams } = input;
  const center = point(coordinates);

  const zoneI = circle(center, zoneParams.radiusZoneIMeters / 1000, {
    steps: 64,
    units: "kilometers",
    properties: {
      kind: "I" as const,
      label: "Medidas Urgentes",
      colorHint: "red" as const,
    },
  }) as ZoneFeature;

  const zoneII = circle(center, zoneParams.radiusZoneIIMeters / 1000, {
    steps: 64,
    units: "kilometers",
    properties: {
      kind: "II" as const,
      label: "Alerta",
      colorHint: "orange" as const,
    },
  }) as ZoneFeature;

  return {
    zoneI,
    zoneII,
    formulaVersion: zoneParams.formulaVersion,
    computedFrom: {
      point: { type: "Point", coordinates },
      zoneParams: { ...zoneParams },
    },
  };
}
