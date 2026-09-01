import type {
  ActiveZone,
  DoseUnit,
  OperationParticipant,
  ZoneParams,
  ZoneSegment,
} from "@/lib/types";

export function doseUnitToMsvPerHour(value: number, unit: DoseUnit): number {
  return unit === "mSv/h" ? value : value / 1000;
}

export function doseRateMsvPerHour(
  zone: ActiveZone,
  zoneParams: ZoneParams,
): number {
  if (zone === "I") {
    const bound = zoneParams.limitZoneI;
    return doseUnitToMsvPerHour(bound.value, bound.unit);
  }
  const bound = zoneParams.limitZoneII.lower;
  return doseUnitToMsvPerHour(bound.value, bound.unit);
}

export function computeSegmentDose(
  seconds: number,
  rateMsvPerHour: number,
): number {
  if (seconds <= 0 || rateMsvPerHour <= 0) return 0;
  return rateMsvPerHour * (seconds / 3600);
}

export function segmentDurationSeconds(
  segment: ZoneSegment,
  now: Date = new Date(),
): number {
  const end = segment.endedAt ?? now;
  return Math.max(0, (end.getTime() - segment.startedAt.getTime()) / 1000);
}

export function computeSessionTotals(
  segments: ZoneSegment[],
  zoneParams: ZoneParams,
  now: Date = new Date(),
): { timeInZoneSeconds: number; accumulatedDoseMsv: number } {
  let timeInZoneSeconds = 0;
  let accumulatedDoseMsv = 0;

  for (const segment of segments) {
    const seconds = segmentDurationSeconds(segment, now);
    const rate = doseRateMsvPerHour(segment.zone, zoneParams);
    timeInZoneSeconds += seconds;
    accumulatedDoseMsv += computeSegmentDose(seconds, rate);
  }

  return { timeInZoneSeconds, accumulatedDoseMsv };
}

export function getActiveSession(participant: OperationParticipant) {
  const last = participant.sessions[participant.sessions.length - 1];
  if (!last || last.endedAt) return null;
  return last;
}

export function isParticipantActive(participant: OperationParticipant): boolean {
  return getActiveSession(participant) !== null;
}

export function getParticipantTotals(
  participant: OperationParticipant,
  zoneParams: ZoneParams,
  now: Date = new Date(),
): { timeInZoneSeconds: number; accumulatedDoseMsv: number } {
  let timeInZoneSeconds = 0;
  let accumulatedDoseMsv = 0;

  for (const session of participant.sessions) {
    if (session.endedAt) {
      timeInZoneSeconds += session.timeInZoneSeconds;
      accumulatedDoseMsv += session.accumulatedDoseMsv;
    } else {
      const live = computeSessionTotals(session.segments, zoneParams, now);
      timeInZoneSeconds += live.timeInZoneSeconds;
      accumulatedDoseMsv += live.accumulatedDoseMsv;
    }
  }

  return { timeInZoneSeconds, accumulatedDoseMsv };
}

export function countActiveParticipants(
  participants: OperationParticipant[],
): number {
  return participants.filter(isParticipantActive).length;
}

export function getSerializedParticipantTotals(
  sessions: Array<{
    endedAt: string | null;
    segments: Array<{
      zone: ActiveZone;
      startedAt: string;
      endedAt: string | null;
    }>;
    timeInZoneSeconds: number;
    accumulatedDoseMsv: number;
  }>,
  zoneParams: ZoneParams,
  now: Date = new Date(),
): { timeInZoneSeconds: number; accumulatedDoseMsv: number } {
  let timeInZoneSeconds = 0;
  let accumulatedDoseMsv = 0;

  for (const session of sessions) {
    if (session.endedAt) {
      timeInZoneSeconds += session.timeInZoneSeconds;
      accumulatedDoseMsv += session.accumulatedDoseMsv;
      continue;
    }

    const segments = session.segments.map((segment) => ({
      zone: segment.zone,
      startedAt: new Date(segment.startedAt),
      endedAt: segment.endedAt ? new Date(segment.endedAt) : undefined,
    }));
    const live = computeSessionTotals(segments, zoneParams, now);
    timeInZoneSeconds += live.timeInZoneSeconds;
    accumulatedDoseMsv += live.accumulatedDoseMsv;
  }

  return { timeInZoneSeconds, accumulatedDoseMsv };
}

export function getTeamTotals(
  participants: OperationParticipant[],
  zoneParams: ZoneParams,
  now: Date = new Date(),
): { timeInZoneSeconds: number; accumulatedDoseMsv: number } {
  let timeInZoneSeconds = 0;
  let accumulatedDoseMsv = 0;

  for (const participant of participants) {
    const totals = getParticipantTotals(participant, zoneParams, now);
    timeInZoneSeconds += totals.timeInZoneSeconds;
    accumulatedDoseMsv += totals.accumulatedDoseMsv;
  }

  return { timeInZoneSeconds, accumulatedDoseMsv };
}
