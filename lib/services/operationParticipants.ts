import { ObjectId } from "mongodb";
import {
  computeSessionTotals,
  getActiveSession,
  isParticipantActive,
} from "@/domain/dosimetry/computeDose";
import { shouldActivateIntervention } from "@/domain/dosimetry/operationActivation";
import {
  closeParticipantActiveSession,
  stopAllActiveParticipantSessions,
} from "@/domain/dosimetry/closeActiveSessions";
import { findInterventionById, updateInterventionById } from "@/lib/repositories/interventions";
import { findUserById } from "@/lib/repositories/users";
import { AppError } from "@/lib/services/interventions";
import { canUpdateIntervention } from "@/lib/services/permissions";
import {
  DEFAULT_ZONE_PARAMS,
  type ActiveZone,
  type InterventionDoc,
  type OperationParticipant,
  type OperationTeam,
  type UserRole,
  type ZoneParams,
} from "@/lib/types";

function getZoneParams(doc: InterventionDoc): ZoneParams {
  return { ...DEFAULT_ZONE_PARAMS, ...doc.zoneParams };
}

function getOperationParticipants(doc: InterventionDoc): OperationParticipant[] {
  return doc.operationParticipants ?? [];
}

function findParticipant(
  participants: OperationParticipant[],
  userId: string,
): OperationParticipant | undefined {
  return participants.find((p) => p.userId.toString() === userId);
}

function assertCanEdit(
  doc: InterventionDoc,
  userId: string,
  role: UserRole,
): void {
  if (!canUpdateIntervention(role, doc, userId)) {
    throw new AppError("FORBIDDEN", "No puedes editar esta intervención", 403);
  }
  if (doc.status === "closed") {
    throw new AppError(
      "FORBIDDEN",
      "La operación está cerrada y no admite cambios",
      403,
    );
  }
}

async function loadIntervention(id: string) {
  const doc = await findInterventionById(id);
  if (!doc) throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  return doc;
}

async function saveParticipants(
  id: string,
  doc: InterventionDoc,
  participants: OperationParticipant[],
  participantIds: ObjectId[],
  extraPatch: Partial<Pick<InterventionDoc, "status">> = {},
) {
  const updated = await updateInterventionById(id, {
    operationParticipants: participants,
    participantIds,
    ...extraPatch,
  });
  if (!updated) {
    throw new AppError("NOT_FOUND", "Intervención no encontrada", 404);
  }
  return updated;
}

export async function addOperationParticipant(
  interventionId: string,
  actorId: string,
  role: UserRole,
  input: { userId: string; team: OperationTeam },
) {
  const doc = await loadIntervention(interventionId);
  assertCanEdit(doc, actorId, role);

  const user = await findUserById(input.userId);
  if (!user || user.role !== "participant") {
    throw new AppError(
      "VALIDATION",
      "El interviniente seleccionado no es válido",
      400,
    );
  }

  const participants = getOperationParticipants(doc);
  if (findParticipant(participants, input.userId)) {
    throw new AppError(
      "CONFLICT",
      "El interviniente ya está asignado a esta operación",
      409,
    );
  }

  const now = new Date();
  const nextParticipants: OperationParticipant[] = [
    ...participants,
    {
      userId: new ObjectId(input.userId),
      team: input.team,
      addedAt: now,
      sessions: [],
    },
  ];

  const participantIds = [
    ...(doc.participantIds ?? []),
    new ObjectId(input.userId),
  ];

  const updated = await saveParticipants(
    interventionId,
    doc,
    nextParticipants,
    participantIds,
  );

  const zoneParams = getZoneParams(updated);
  const record = findParticipant(
    getOperationParticipants(updated),
    input.userId,
  )!;

  return serializeParticipantRecord(
    record,
    input.userId,
    zoneParams,
    user.name,
  );
}

export async function removeOperationParticipant(
  interventionId: string,
  actorId: string,
  role: UserRole,
  userId: string,
) {
  const doc = await loadIntervention(interventionId);
  assertCanEdit(doc, actorId, role);

  const participants = getOperationParticipants(doc);
  const participant = findParticipant(participants, userId);
  if (!participant) {
    throw new AppError(
      "NOT_FOUND",
      "El interviniente no está en esta operación",
      404,
    );
  }

  if (isParticipantActive(participant)) {
    throw new AppError(
      "CONFLICT",
      "No se puede quitar un interviniente con sesión activa",
      409,
    );
  }

  const nextParticipants = participants.filter(
    (p) => p.userId.toString() !== userId,
  );
  const participantIds = (doc.participantIds ?? []).filter(
    (id) => id.toString() !== userId,
  );

  await saveParticipants(
    interventionId,
    doc,
    nextParticipants,
    participantIds,
  );
  return { ok: true };
}

export async function startParticipantSession(
  interventionId: string,
  actorId: string,
  role: UserRole,
  userId: string,
  zone: ActiveZone,
) {
  const doc = await loadIntervention(interventionId);
  assertCanEdit(doc, actorId, role);

  const participants = getOperationParticipants(doc);
  const participant = findParticipant(participants, userId);
  if (!participant) {
    throw new AppError(
      "NOT_FOUND",
      "El interviniente no está en esta operación",
      404,
    );
  }

  if (isParticipantActive(participant)) {
    throw new AppError(
      "CONFLICT",
      "El interviniente ya tiene una sesión activa",
      409,
    );
  }

  const now = new Date();
  const session = {
    startedAt: now,
    segments: [{ zone, startedAt: now }],
    timeInZoneSeconds: 0,
    accumulatedDoseMsv: 0,
  };

  const nextParticipants = participants.map((p) =>
    p.userId.toString() === userId
      ? { ...p, sessions: [...p.sessions, session] }
      : p,
  );

  const activate = shouldActivateIntervention(doc.status);
  const updated = await saveParticipants(
    interventionId,
    doc,
    nextParticipants,
    doc.participantIds ?? [],
    activate ? { status: "active" } : {},
  );

  const user = await findUserById(userId);
  const record = serializeParticipantRecord(
    findParticipant(getOperationParticipants(updated), userId)!,
    userId,
    getZoneParams(updated),
    user?.name,
  );

  return activate
    ? { ...record, interventionStatus: "active" as const }
    : record;
}

export async function changeParticipantZone(
  interventionId: string,
  actorId: string,
  role: UserRole,
  userId: string,
  zone: ActiveZone,
) {
  const doc = await loadIntervention(interventionId);
  assertCanEdit(doc, actorId, role);

  const participants = getOperationParticipants(doc);
  const participant = findParticipant(participants, userId);
  if (!participant) {
    throw new AppError(
      "NOT_FOUND",
      "El interviniente no está en esta operación",
      404,
    );
  }

  const activeSession = getActiveSession(participant);
  if (!activeSession) {
    throw new AppError(
      "CONFLICT",
      "No hay sesión activa para cambiar de zona",
      409,
    );
  }

  const lastSegment =
    activeSession.segments[activeSession.segments.length - 1];
  if (lastSegment.zone === zone && !lastSegment.endedAt) {
    const user = await findUserById(userId);
    return serializeParticipantRecord(
      participant,
      userId,
      getZoneParams(doc),
      user?.name,
    );
  }

  const now = new Date();
  const updatedSegments = activeSession.segments.map((segment, index) =>
    index === activeSession.segments.length - 1 && !segment.endedAt
      ? { ...segment, endedAt: now }
      : segment,
  );

  if (lastSegment.zone !== zone) {
    updatedSegments.push({ zone, startedAt: now });
  }

  const nextParticipants = participants.map((p) => {
    if (p.userId.toString() !== userId) return p;
    const sessions = p.sessions.map((session) =>
      session === activeSession
        ? { ...session, segments: updatedSegments }
        : session,
    );
    return { ...p, sessions };
  });

  const updated = await saveParticipants(
    interventionId,
    doc,
    nextParticipants,
    doc.participantIds ?? [],
  );

  const user = await findUserById(userId);
  return serializeParticipantRecord(
    findParticipant(getOperationParticipants(updated), userId)!,
    userId,
    getZoneParams(updated),
    user?.name,
  );
}

export async function stopParticipantSession(
  interventionId: string,
  actorId: string,
  role: UserRole,
  userId: string,
) {
  const doc = await loadIntervention(interventionId);
  assertCanEdit(doc, actorId, role);

  const zoneParams = getZoneParams(doc);
  const participants = getOperationParticipants(doc);
  const participant = findParticipant(participants, userId);
  if (!participant) {
    throw new AppError(
      "NOT_FOUND",
      "El interviniente no está en esta operación",
      404,
    );
  }

  const activeSession = getActiveSession(participant);
  if (!activeSession) {
    throw new AppError("CONFLICT", "No hay sesión activa que detener", 409);
  }

  const now = new Date();
  const nextParticipants = participants.map((p) =>
    p.userId.toString() === userId
      ? closeParticipantActiveSession(p, zoneParams, now)
      : p,
  );

  const updated = await saveParticipants(
    interventionId,
    doc,
    nextParticipants,
    doc.participantIds ?? [],
  );

  const user = await findUserById(userId);
  return serializeParticipantRecord(
    findParticipant(getOperationParticipants(updated), userId)!,
    userId,
    zoneParams,
    user?.name,
  );
}

export function serializeZoneSegment(segment: {
  zone: ActiveZone;
  startedAt: Date;
  endedAt?: Date;
}) {
  return {
    zone: segment.zone,
    startedAt: segment.startedAt.toISOString(),
    endedAt: segment.endedAt?.toISOString() ?? null,
  };
}

export function serializeSession(session: {
  startedAt: Date;
  endedAt?: Date;
  segments: Array<{ zone: ActiveZone; startedAt: Date; endedAt?: Date }>;
  timeInZoneSeconds: number;
  accumulatedDoseMsv: number;
}) {
  return {
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    segments: session.segments.map(serializeZoneSegment),
    timeInZoneSeconds: session.timeInZoneSeconds,
    accumulatedDoseMsv: session.accumulatedDoseMsv,
  };
}

export function serializeParticipantRecord(
  participant: OperationParticipant,
  userId: string,
  zoneParams: ZoneParams,
  name?: string,
) {
  const activeSession = getActiveSession(participant);
  const activeZone =
    activeSession?.segments[activeSession.segments.length - 1]?.zone ?? null;

  return {
    userId,
    name: name ?? userId,
    team: participant.team,
    addedAt: participant.addedAt.toISOString(),
    sessions: participant.sessions.map(serializeSession),
    isActive: activeSession !== null,
    activeZone,
    zoneParams,
  };
}

export async function serializeOperationParticipants(
  doc: InterventionDoc,
  nameByUserId?: Map<string, string>,
) {
  const zoneParams = getZoneParams(doc);
  const participants = getOperationParticipants(doc);

  if (!nameByUserId) {
    const { findUsersByIds } = await import("@/lib/repositories/users");
    const users = await findUsersByIds(
      participants.map((p) => p.userId.toString()),
    );
    nameByUserId = new Map(users.map((u) => [u._id.toString(), u.name]));
  }

  return participants.map((participant) =>
    serializeParticipantRecord(
      participant,
      participant.userId.toString(),
      zoneParams,
      nameByUserId!.get(participant.userId.toString()) ?? "—",
    ),
  );
}
