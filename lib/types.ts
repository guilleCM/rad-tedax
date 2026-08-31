import type { ObjectId } from "mongodb";
import type { Feature, Point, Polygon } from "geojson";

export type UserRole = "manager" | "leader" | "participant";

export type InterventionStatus = "draft" | "active" | "closed";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string | null;
  passwordHash: string | null;
  role: UserRole;
  /** Ausente en documentos creados antes del campo obligatorio */
  createdById?: ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DoseLimitOp = "lt" | "lte" | "eq" | "gt" | "gte";

export type DoseUnit = "uSv/h" | "mSv/h";

export interface DoseLimitBound {
  op: DoseLimitOp;
  value: number;
  unit: DoseUnit;
}

export interface ZoneIILimit {
  lower: DoseLimitBound;
  upper: DoseLimitBound;
}

export interface ZoneParams {
  formulaVersion: string;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
  limitZoneI: DoseLimitBound;
  limitZoneII: ZoneIILimit;
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
  controlPoint?: {
    type: "Point";
    coordinates: [number, number];
  };
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

export const DEFAULT_LIMIT_ZONE_I: DoseLimitBound = {
  op: "gte",
  value: 5,
  unit: "mSv/h",
};

export const DEFAULT_LIMIT_ZONE_II: ZoneIILimit = {
  lower: { op: "gte", value: 100, unit: "uSv/h" },
  upper: { op: "lt", value: 5, unit: "mSv/h" },
};

export const DEFAULT_ZONE_PARAMS: ZoneParams = {
  formulaVersion: "v1-placeholder",
  radiusZoneIMeters: 100,
  radiusZoneIIMeters: 300,
  limitZoneI: DEFAULT_LIMIT_ZONE_I,
  limitZoneII: DEFAULT_LIMIT_ZONE_II,
};
