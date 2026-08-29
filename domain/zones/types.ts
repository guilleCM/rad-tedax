import type { Feature, Point, Polygon } from "geojson";

export interface ZoneParamsInput {
  formulaVersion: string;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
}

export interface ZoneInput {
  /** GeoJSON order: [longitude, latitude] */
  point: [number, number];
  zoneParams: ZoneParamsInput;
}

export type ZoneFeature = Feature<
  Polygon,
  {
    kind: "I" | "II";
    label: string;
    colorHint: "red" | "orange";
  }
>;

export interface ZoneResult {
  zoneI: ZoneFeature;
  zoneII: ZoneFeature;
  formulaVersion: string;
  computedFrom: {
    point: Point;
    zoneParams: ZoneParamsInput;
  };
}
