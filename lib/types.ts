import type { ObjectId } from "mongodb";
import type { Feature, Point, Polygon } from "geojson";

export type UserRole = "manager" | "participant";

export type InterventionStatus = "draft" | "active" | "closed";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneParams {
  formulaVersion: string;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
}

export type ZoneFeature = Feature<
  Polygon,
  {
    kind: "I" | "II";
    label: string;
    colorHint: "red" | "orange";
  }
>;

export interface InterventionZones {
  zoneI: ZoneFeature;
  zoneII: ZoneFeature;
  computedAt: Date;
  computedFrom: {
    point: Feature<Point>["geometry"];
    zoneParams: ZoneParams;
  };
}

export interface ManualOverrides {
  zoneI?: ZoneFeature;
  zoneII?: ZoneFeature;
  notes?: string;
}

export interface InterventionDoc {
  _id: ObjectId;
  name: string;
  ownerId: ObjectId;
  participantIds: ObjectId[];
  status: InterventionStatus;
  occurredAt: Date;
  location?: {
    point: {
      type: "Point";
      coordinates: [number, number];
    };
    label?: string;
  };
  zoneParams: ZoneParams;
  zones?: InterventionZones;
  manualOverrides?: ManualOverrides;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_ZONE_PARAMS: ZoneParams = {
  formulaVersion: "v1-placeholder",
  radiusZoneIMeters: 100,
  radiusZoneIIMeters: 300,
};
