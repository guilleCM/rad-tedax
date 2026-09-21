import { ObjectId } from "mongodb";
import { calculateZones } from "@/domain/zones/calculateZones";
import { AppError } from "@/lib/errors";
import { geocodeAddress } from "@/lib/geocoding/nominatim";
import {
  deleteInterventionById,
  findAllInterventions,
  findInterventionById,
  insertIntervention,
  updateInterventionById,
} from "@/lib/repositories/interventions";
import { isOwner } from "@/lib/services/intervention-access";
import {
  serializeOperationParticipants,
} from "@/lib/services/operationParticipants";
import { stopAllActiveParticipantSessions } from "@/domain/dosimetry/closeActiveSessions";
import {
  canCreateIntervention,
  canDeleteIntervention,
  canListInterventions,
  canReadIntervention,
  canUpdateIntervention,
} from "@/lib/services/permissions";
import {
  DEFAULT_OPERATION_DOSIMETRY,
  DEFAULT_ZONE_PARAMS,
  TACTICAL_POINT_KINDS,
  type InterventionDoc,
  type InterventionZones,
  type ManualOverrides,
  type OperationDosimetry,
  type UserRole,
  type ZoneParams,
} from "@/lib/types";

export { isOwner };

const GEOCODE_TIMEOUT_MS = 4_000;

async function geocodeWithTimeout(
  label: string,
): Promise<[number, number] | undefined> {
  try {
    const result = await Promise.race([
      geocodeAddress(label),
      new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("GEOCODE_TIMEOUT")), GEOCODE_TIMEOUT_MS);
      }),
    ]);
    return result ?? undefined;
  } catch (error) {
    console.warn(`Geocoding failed for "${label}":`, error);
    return undefined;
  }
}

function buildZones(
  coordinates: [number, number],
  zoneParams: ZoneParams,
): InterventionZones {
  const result = calculateZones({ point: coordinates, zoneParams });
  return {
    zoneI: result.zoneI,
    zoneII: result.zoneII,
    computedAt: new Date(),
    computedFrom: {
      point: result.computedFrom.point,
      zoneParams,
    },
  };
}

export function serializeIntervention(doc: InterventionDoc) {
  const zoneParams = {
    ...DEFAULT_ZONE_PARAMS,
    ...doc.zoneParams,
    zoningPhase: doc.zoneParams.zoningPhase ?? "measured",
    zoneIEstimated: doc.zoneParams.zoneIEstimated ?? false,
  };
  return {
    id: doc._id.toString(),
    name: doc.name,
    ownerId: doc.ownerId.toString(),
    participantIds: (doc.participantIds ?? []).map((id) => id.toString()),
    status: doc.status,
    occurredAt: doc.occurredAt.toISOString(),
    location: doc.location
      ? {
          point: doc.location.point,
          label: doc.location.label ?? null,
        }
      : null,
    zoneParams,
    zones: doc.zones
      ? {
          zoneI: doc.zones.zoneI,
          zoneII: doc.zones.zoneII,
          computedAt: doc.zones.computedAt.toISOString(),
          computedFrom: doc.zones.computedFrom,
        }
      : null,
    manualOverrides: doc.manualOverrides
      ? {
          ...doc.manualOverrides,
          annotations: doc.manualOverrides.annotations?.map((annotation) => ({
            text: annotation.text,
            createdAt:
              annotation.createdAt instanceof Date
                ? annotation.createdAt.toISOString()
                : annotation.createdAt,
          })),
        }
      : null,
    operationDosimetry: {
      ...DEFAULT_OPERATION_DOSIMETRY,
      ...doc.operationDosimetry,
      maxOperationDose: {
        ...DEFAULT_OPERATION_DOSIMETRY.maxOperationDose,
        ...doc.operationDosimetry?.maxOperationDose,
      },
    },
    operationParticipants: (doc.operationParticipants ?? []).map((participant) => ({
      userId: participant.userId.toString(),
      team: participant.team,
      addedAt: participant.addedAt.toISOString(),
      sessions: participant.sessions.map((session) => ({
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        segments: session.segments.map((segment) => ({
          zone: segment.zone,
          startedAt: segment.startedAt.toISOString(),
          endedAt: segment.endedAt?.toISOString() ?? null,
        })),
        timeInZoneSeconds: session.timeInZoneSeconds,
        accumulatedDoseMsv: session.accumulatedDoseMsv,
      })),
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function serializeInterventionWithParticipants(doc: InterventionDoc) {
  const base = serializeIntervention(doc);
  const operationParticipants = await serializeOperationParticipants(doc);
  return { ...base, operationParticipants };
}

export async function listInterventions(userId: string, role: UserRole) {
  if (!canListInterventions(role)) {
    throw new AppError("FORBIDDEN", "No tienes acceso a las intervenciones", 403);
  }
  const docs = await findAllInterventions();
  return docs.map(serializeIntervention);
}

export async function getIntervention(
  id: string,
  userId: string,
  role: UserRole,
) {
  const doc = await findInterventionById(id);
  if (!doc) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  if (!canReadIntervention(role)) {
    throw new AppError("FORBIDDEN", "No tienes acceso a esta intervención", 403);
  }
  return serializeIntervention(doc);
}

export async function getInterventionWithOperationParticipants(
  id: string,
  userId: string,
  role: UserRole,
) {
  const doc = await findInterventionById(id);
  if (!doc) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  if (!canReadIntervention(role)) {
    throw new AppError("FORBIDDEN", "No tienes acceso a esta intervención", 403);
  }
  const base = serializeIntervention(doc);
  const operationParticipants = await serializeOperationParticipants(doc);
  return { ...base, operationParticipants };
}

export async function createIntervention(
  userId: string,
  role: UserRole,
  input: {
    name: string;
    occurredAt?: Date;
    status?: InterventionDoc["status"];
    coordinates?: [number, number];
    locationLabel?: string;
    zoneParams?: ZoneParams;
  },
) {
  if (!canCreateIntervention(role)) {
    throw new AppError("FORBIDDEN", "No puedes crear intervenciones", 403);
  }

  const now = new Date();
  const zoneParams = { ...DEFAULT_ZONE_PARAMS, ...input.zoneParams };

  let location: InterventionDoc["location"];
  let zones: InterventionZones | undefined;

  let coordinates = input.coordinates;
  if (!coordinates && input.locationLabel?.trim()) {
    coordinates = await geocodeWithTimeout(input.locationLabel);
  }

  if (coordinates) {
    location = {
      point: { type: "Point", coordinates },
      label: input.locationLabel,
    };
    zones = buildZones(coordinates, zoneParams);
  }

  const doc = await insertIntervention({
    name: input.name,
    ownerId: new ObjectId(userId),
    participantIds: [],
    status: input.status ?? "draft",
    occurredAt: input.occurredAt ?? now,
    location,
    zoneParams,
    zones,
    operationDosimetry: DEFAULT_OPERATION_DOSIMETRY,
    createdAt: now,
    updatedAt: now,
  });

  return serializeIntervention(doc);
}

export async function closeIntervention(
  id: string,
  userId: string,
  role: UserRole,
) {
  const doc = await findInterventionById(id);
  if (!doc) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  if (!canUpdateIntervention(role, doc, userId)) {
    throw new AppError("FORBIDDEN", "No puedes editar esta intervención", 403);
  }
  if (doc.status === "closed") {
    throw new AppError("CONFLICT", "La operación ya está cerrada", 409);
  }

  const zoneParams = { ...DEFAULT_ZONE_PARAMS, ...doc.zoneParams };
  const participants = doc.operationParticipants ?? [];
  const stoppedParticipants = stopAllActiveParticipantSessions(
    participants,
    zoneParams,
  );

  const updated = await updateInterventionById(id, {
    status: "closed",
    operationParticipants: stoppedParticipants,
  });
  if (!updated) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  return serializeIntervention(updated);
}

export async function updateIntervention(
  id: string,
  userId: string,
  role: UserRole,
  input: {
    name?: string;
    occurredAt?: Date;
    status?: InterventionDoc["status"];
    coordinates?: [number, number] | null;
    locationLabel?: string | null;
    zoneParams?: ZoneParams;
    manualOverrides?: {
      notes?: string;
      annotations?: ManualOverrides["annotations"];
      clearZones?: boolean;
      controlPoint?: ManualOverrides["controlPoint"] | null;
      decontaminationStation?: ManualOverrides["decontaminationStation"] | null;
      advancedCommandPost?: ManualOverrides["advancedCommandPost"] | null;
      entryExit?: ManualOverrides["entryExit"] | null;
      alertReading?: ManualOverrides["alertReading"] | null;
    };
    operationDosimetry?: OperationDosimetry;
    recalculate?: boolean;
  },
) {
  const doc = await findInterventionById(id);
  if (!doc) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  if (!canUpdateIntervention(role, doc, userId)) {
    throw new AppError("FORBIDDEN", "No puedes editar esta intervención", 403);
  }

  if (input.status === "closed") {
    return closeIntervention(id, userId, role);
  }

  if (doc.status === "closed") {
    throw new AppError(
      "FORBIDDEN",
      "La operación está cerrada y no admite cambios",
      403,
    );
  }

  const patch: Partial<InterventionDoc> = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.occurredAt !== undefined) patch.occurredAt = input.occurredAt;
  if (input.status !== undefined) patch.status = input.status;

  const zoneParams = input.zoneParams
    ? {
        ...DEFAULT_ZONE_PARAMS,
        ...doc.zoneParams,
        ...input.zoneParams,
        limitZoneI:
          input.zoneParams.limitZoneI ??
          doc.zoneParams.limitZoneI ??
          DEFAULT_ZONE_PARAMS.limitZoneI,
        limitZoneII:
          input.zoneParams.limitZoneII ??
          doc.zoneParams.limitZoneII ??
          DEFAULT_ZONE_PARAMS.limitZoneII,
        zoningPhase:
          input.zoneParams.zoningPhase ??
          doc.zoneParams.zoningPhase ??
          "measured",
        zoneIEstimated:
          input.zoneParams.zoneIEstimated ??
          doc.zoneParams.zoneIEstimated ??
          false,
      }
    : { ...DEFAULT_ZONE_PARAMS, ...doc.zoneParams };
  if (input.zoneParams) patch.zoneParams = zoneParams;

  if (input.operationDosimetry) {
    patch.operationDosimetry = {
      ...DEFAULT_OPERATION_DOSIMETRY,
      ...doc.operationDosimetry,
      ...input.operationDosimetry,
      maxOperationDose: {
        ...DEFAULT_OPERATION_DOSIMETRY.maxOperationDose,
        ...doc.operationDosimetry?.maxOperationDose,
        ...input.operationDosimetry.maxOperationDose,
      },
    };
  }

  let coordinates = doc.location?.point.coordinates;
  let locationLabel = doc.location?.label;

  if (input.coordinates === null) {
    patch.location = undefined;
    patch.zones = undefined;
    coordinates = undefined;
  } else if (input.coordinates) {
    coordinates = input.coordinates;
    if (input.locationLabel !== undefined) {
      locationLabel = input.locationLabel ?? undefined;
    }
    patch.location = {
      point: { type: "Point", coordinates },
      label: locationLabel,
    };
  } else if (input.locationLabel !== undefined && doc.location) {
    patch.location = {
      ...doc.location,
      label: input.locationLabel ?? undefined,
    };
  }

  const shouldRecalculate =
    Boolean(input.recalculate) ||
    Boolean(input.coordinates) ||
    Boolean(input.zoneParams);

  if (shouldRecalculate && coordinates) {
    patch.zones = buildZones(coordinates, zoneParams);
    if (input.manualOverrides?.clearZones) {
      patch.manualOverrides = {
        ...(doc.manualOverrides ?? {}),
        zoneI: undefined,
        zoneII: undefined,
        notes: input.manualOverrides.notes ?? doc.manualOverrides?.notes,
        annotations:
          input.manualOverrides.annotations ?? doc.manualOverrides?.annotations,
      };
      for (const kind of TACTICAL_POINT_KINDS) {
        patch.manualOverrides[kind] =
          input.manualOverrides[kind] === undefined
            ? doc.manualOverrides?.[kind]
            : input.manualOverrides[kind] ?? undefined;
      }
      patch.manualOverrides.alertReading =
        input.manualOverrides.alertReading === undefined
          ? doc.manualOverrides?.alertReading
          : input.manualOverrides.alertReading ?? undefined;
    }
  }

  const hasTacticalPointPatch = TACTICAL_POINT_KINDS.some(
    (kind) => input.manualOverrides?.[kind] !== undefined,
  );
  const hasAlertReadingPatch = input.manualOverrides?.alertReading !== undefined;

  if (
    input.manualOverrides &&
    (input.manualOverrides.notes !== undefined ||
      input.manualOverrides.annotations !== undefined ||
      hasTacticalPointPatch ||
      hasAlertReadingPatch)
  ) {
    const source = input.manualOverrides;
    const overrides: ManualOverrides = {
      ...(doc.manualOverrides ?? {}),
      ...(patch.manualOverrides ?? {}),
    };
    if (source.notes !== undefined) {
      overrides.notes = source.notes;
    }
    if (source.annotations !== undefined) {
      overrides.annotations = source.annotations;
    }
    for (const kind of TACTICAL_POINT_KINDS) {
      if (source[kind] !== undefined) {
        overrides[kind] = source[kind] ?? undefined;
      }
    }
    if (source.alertReading !== undefined) {
      overrides.alertReading = source.alertReading ?? undefined;
    }
    patch.manualOverrides = overrides;
  }

  const updated = await updateInterventionById(id, patch);
  if (!updated) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  return serializeIntervention(updated);
}

export async function recalculateIntervention(
  id: string,
  userId: string,
  role: UserRole,
) {
  return updateIntervention(id, userId, role, {
    recalculate: true,
    manualOverrides: { clearZones: true },
  });
}

export async function removeIntervention(
  id: string,
  userId: string,
  role: UserRole,
) {
  const doc = await findInterventionById(id);
  if (!doc) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  if (!canDeleteIntervention(role)) {
    throw new AppError("FORBIDDEN", "No puedes eliminar intervenciones", 403);
  }
  const ok = await deleteInterventionById(id);
  if (!ok) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  return { ok: true };
}
