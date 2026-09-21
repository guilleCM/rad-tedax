import type { ObjectId } from "mongodb";
import type { Feature, Point, Polygon } from "geojson";
import {
  INITIAL_CORDON_INNER_METERS,
  INITIAL_CORDON_OUTER_METERS,
  type ZoningPhase,
} from "@/domain/zones/inverseSquare";

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

export type { ZoningPhase };

export interface ZoneParams {
  formulaVersion: string;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
  limitZoneI: DoseLimitBound;
  limitZoneII: ZoneIILimit;
  /** Ausente en documentos anteriores al cinturón inicial. */
  zoningPhase?: ZoningPhase;
  /** La Zona I sale de la lectura de 100 µSv/h, no de una medida directa. */
  zoneIEstimated?: boolean;
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

export type GeoJsonLngLatPoint = {
  type: "Point";
  coordinates: [number, number];
};

export const TACTICAL_POINT_KINDS = [
  "controlPoint",
  "decontaminationStation",
  "advancedCommandPost",
  "entryExit",
] as const;

export type TacticalPointKind = (typeof TACTICAL_POINT_KINDS)[number];

export interface ManualOverrides {
  zoneI?: ZoneFeature;
  zoneII?: ZoneFeature;
  notes?: string;
  annotations?: {
    text: string;
    createdAt: Date;
  }[];
  controlPoint?: GeoJsonLngLatPoint;
  decontaminationStation?: GeoJsonLngLatPoint;
  advancedCommandPost?: GeoJsonLngLatPoint;
  entryExit?: GeoJsonLngLatPoint;
  /** Punto donde el radiámetro lee 100 µSv/h. */
  alertReading?: GeoJsonLngLatPoint;
}

export type AccumulatedDoseUnit = "mSv" | "uSv";

export type OperationTeam = "search" | "intervention";

export type ActiveZone = "I" | "II";

export interface ZoneSegment {
  zone: ActiveZone;
  startedAt: Date;
  endedAt?: Date;
}

export interface ParticipantZoneSession {
  startedAt: Date;
  endedAt?: Date;
  segments: ZoneSegment[];
  timeInZoneSeconds: number;
  accumulatedDoseMsv: number;
}

export interface OperationParticipant {
  userId: ObjectId;
  team: OperationTeam;
  addedAt: Date;
  sessions: ParticipantZoneSession[];
}

export interface OperationDosimetry {
  maxOperationDose: {
    value: number;
    unit: AccumulatedDoseUnit;
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
  operationDosimetry?: OperationDosimetry;
  operationParticipants?: OperationParticipant[];
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
  radiusZoneIMeters: INITIAL_CORDON_INNER_METERS,
  radiusZoneIIMeters: INITIAL_CORDON_OUTER_METERS,
  limitZoneI: DEFAULT_LIMIT_ZONE_I,
  limitZoneII: DEFAULT_LIMIT_ZONE_II,
  zoningPhase: "initial-cordon",
  zoneIEstimated: false,
};

export const DEFAULT_OPERATION_DOSIMETRY: OperationDosimetry = {
  maxOperationDose: { value: 10, unit: "mSv" },
};
