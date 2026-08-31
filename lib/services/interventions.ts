import { ObjectId } from "mongodb";
import { calculateZones } from "@/domain/zones/calculateZones";
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
  canCreateIntervention,
  canDeleteIntervention,
  canListInterventions,
  canReadIntervention,
  canUpdateIntervention,
} from "@/lib/services/permissions";
import {
  DEFAULT_ZONE_PARAMS,
  type InterventionDoc,
  type InterventionZones,
  type ManualOverrides,
  type UserRole,
  type ZoneParams,
} from "@/lib/types";

export { isOwner };

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
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
    computedFrom: result.computedFrom,
  };
}

export function serializeIntervention(doc: InterventionDoc) {
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
    zoneParams: doc.zoneParams,
    zones: doc.zones
      ? {
          zoneI: doc.zones.zoneI,
          zoneII: doc.zones.zoneII,
          computedAt: doc.zones.computedAt.toISOString(),
          computedFrom: doc.zones.computedFrom,
        }
      : null,
    manualOverrides: doc.manualOverrides ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
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
    coordinates = (await geocodeAddress(input.locationLabel)) ?? undefined;
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
    createdAt: now,
    updatedAt: now,
  });

  return serializeIntervention(doc);
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
    manualOverrides?: { notes?: string; clearZones?: boolean };
    recalculate?: boolean;
  },
) {
  const doc = await findInterventionById(id);
  if (!doc) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  if (!canUpdateIntervention(role, doc, userId)) {
    throw new AppError("FORBIDDEN", "No puedes editar esta intervención", 403);
  }

  const patch: Partial<InterventionDoc> = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.occurredAt !== undefined) patch.occurredAt = input.occurredAt;
  if (input.status !== undefined) patch.status = input.status;

  const zoneParams = input.zoneParams
    ? { ...doc.zoneParams, ...input.zoneParams }
    : doc.zoneParams;
  if (input.zoneParams) patch.zoneParams = zoneParams;

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
      };
    }
  }

  if (input.manualOverrides?.notes !== undefined) {
    const overrides: ManualOverrides = {
      ...(doc.manualOverrides ?? {}),
      ...(patch.manualOverrides ?? {}),
      notes: input.manualOverrides.notes,
    };
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
