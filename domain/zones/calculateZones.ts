import { calculateZonesV1 } from "./formulas/v1";
import type { ZoneInput, ZoneResult } from "./types";

export type { ZoneInput, ZoneResult, ZoneParamsInput, ZoneFeature } from "./types";

/**
 * Pure zone calculator — no React, no MongoDB.
 * Swap formula implementations via zoneParams.formulaVersion.
 */
export function calculateZones(input: ZoneInput): ZoneResult {
  const version = input.zoneParams.formulaVersion || "v1-placeholder";

  switch (version) {
    case "v1-placeholder":
    default:
      return calculateZonesV1({
        ...input,
        zoneParams: {
          ...input.zoneParams,
          formulaVersion: "v1-placeholder",
        },
      });
  }
}
