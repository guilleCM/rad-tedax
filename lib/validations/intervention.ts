import { z } from "zod";
import { DEFAULT_ZONE_PARAMS } from "@/lib/types";

export const lngLatSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const doseLimitOpSchema = z.enum(["lt", "lte", "eq", "gt", "gte"]);
const doseUnitSchema = z.enum(["uSv/h", "mSv/h"]);

export const doseLimitBoundSchema = z.object({
  op: doseLimitOpSchema,
  value: z.number().positive(),
  unit: doseUnitSchema,
});

export const zoneIILimitSchema = z.object({
  lower: doseLimitBoundSchema,
  upper: doseLimitBoundSchema,
});

export const zoneParamsSchema = z
  .object({
    formulaVersion: z.string().default(DEFAULT_ZONE_PARAMS.formulaVersion),
    radiusZoneIMeters: z
      .number()
      .positive()
      .default(DEFAULT_ZONE_PARAMS.radiusZoneIMeters),
    radiusZoneIIMeters: z
      .number()
      .positive()
      .default(DEFAULT_ZONE_PARAMS.radiusZoneIIMeters),
    limitZoneI: doseLimitBoundSchema.default(DEFAULT_ZONE_PARAMS.limitZoneI),
    limitZoneII: zoneIILimitSchema.default(DEFAULT_ZONE_PARAMS.limitZoneII),
  })
  .refine((p) => p.radiusZoneIIMeters >= p.radiusZoneIMeters, {
    message: "radiusZoneIIMeters must be >= radiusZoneIMeters",
  });

const accumulatedDoseUnitSchema = z.enum(["mSv", "uSv"]);

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const operationDosimetrySchema = z.object({
  maxOperationDose: z.object({
    value: z.number().positive(),
    unit: accumulatedDoseUnitSchema,
  }),
});

export const operationTeamSchema = z.enum(["search", "intervention"]);

export const activeZoneSchema = z.enum(["I", "II"]);

export const addOperationParticipantSchema = z.object({
  userId: objectIdSchema,
  team: operationTeamSchema,
});

export const startSessionSchema = z.object({
  action: z.literal("start"),
  zone: activeZoneSchema,
});

export const changeZoneSchema = z.object({
  action: z.literal("changeZone"),
  zone: activeZoneSchema,
});

export const stopSessionSchema = z.object({
  action: z.literal("stop"),
});

export const sessionActionSchema = z.discriminatedUnion("action", [
  startSessionSchema,
  changeZoneSchema,
  stopSessionSchema,
]);

export const createInterventionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  occurredAt: z.coerce.date().optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  coordinates: lngLatSchema.optional(),
  locationLabel: z.string().trim().max(200).optional(),
  zoneParams: zoneParamsSchema.optional(),
});

export const updateInterventionSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  occurredAt: z.coerce.date().optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  coordinates: lngLatSchema.nullable().optional(),
  locationLabel: z.string().trim().max(200).nullable().optional(),
  zoneParams: zoneParamsSchema.optional(),
  manualOverrides: z
    .object({
      notes: z.string().max(2000).optional(),
      clearZones: z.boolean().optional(),
      controlPoint: z
        .object({
          type: z.literal("Point"),
          coordinates: lngLatSchema,
        })
        .nullable()
        .optional(),
    })
    .optional(),
  operationDosimetry: operationDosimetrySchema.optional(),
  recalculate: z.boolean().optional(),
});
