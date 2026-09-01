import {
  computeSessionTotals,
  getActiveSession,
} from "@/domain/dosimetry/computeDose";
import type { OperationParticipant, ZoneParams } from "@/lib/types";

export function closeParticipantActiveSession(
  participant: OperationParticipant,
  zoneParams: ZoneParams,
  now: Date = new Date(),
): OperationParticipant {
  const activeSession = getActiveSession(participant);
  if (!activeSession) return participant;

  const closedSegments = activeSession.segments.map((segment, index) =>
    index === activeSession.segments.length - 1 && !segment.endedAt
      ? { ...segment, endedAt: now }
      : segment,
  );
  const totals = computeSessionTotals(closedSegments, zoneParams, now);
  const closedSession = {
    ...activeSession,
    endedAt: now,
    segments: closedSegments,
    timeInZoneSeconds: totals.timeInZoneSeconds,
    accumulatedDoseMsv: totals.accumulatedDoseMsv,
  };

  return {
    ...participant,
    sessions: participant.sessions.map((session) =>
      session === activeSession ? closedSession : session,
    ),
  };
}

export function stopAllActiveParticipantSessions(
  participants: OperationParticipant[],
  zoneParams: ZoneParams,
  now: Date = new Date(),
): OperationParticipant[] {
  return participants.map((participant) =>
    closeParticipantActiveSession(participant, zoneParams, now),
  );
}
