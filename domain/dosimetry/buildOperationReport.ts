import {
  buildOperationHistoryEvents,
  type OperationHistoryEvent,
} from "@/domain/dosimetry/buildOperationHistory";
import {
  doseRateMsvPerHour,
  getSerializedParticipantTotals,
} from "@/domain/dosimetry/computeDose";
import {
  dosePercentOfLimit,
} from "@/lib/dosimetry/formatOperationDose";
import { doseRiskLevel } from "@/lib/dosimetry/riskLevel";
import type {
  AccumulatedDoseUnit,
  InterventionStatus,
  OperationDosimetry,
  OperationTeam,
  ZoneParams,
} from "@/lib/types";

const OPERATION_TEAM_LABELS: Record<OperationTeam, string> = {
  search: "Equipo de búsqueda",
  intervention: "Equipo de intervención",
};

export type OperationReportParticipantSession = {
  startedAt: string;
  endedAt: string | null;
  segments: Array<{
    zone: "I" | "II";
    startedAt: string;
    endedAt: string | null;
  }>;
  timeInZoneSeconds: number;
  accumulatedDoseMsv: number;
};

export type OperationReportParticipantInput = {
  userId: string;
  name: string;
  team: OperationTeam;
  addedAt: string;
  isActive: boolean;
  activeZone: "I" | "II" | null;
  zoneParams: ZoneParams;
  sessions: OperationReportParticipantSession[];
};

export type OperationReportParticipant = {
  userId: string;
  name: string;
  team: OperationTeam;
  teamLabel: string;
  timeInZoneSeconds: number;
  accumulatedDoseMsv: number;
  percentOfLimit: number;
  riskLevel: ReturnType<typeof doseRiskLevel>;
};

export type OperationReportSnapshot = {
  generatedAt: string;
  operation: {
    name: string;
    status: InterventionStatus;
    occurredAt: string;
    durationSeconds: number | null;
  };
  summaryNotes: string | null;
  location: {
    label: string | null;
    coordinates: [number, number] | null;
  } | null;
  controlPoint: [number, number] | null;
  zoneParams: ZoneParams;
  dosimetry: {
    maxOperationDose: OperationDosimetry["maxOperationDose"];
    maxZoneDoseRateMsvPerHour: number;
    teamAccumulatedMsv: number;
    teamPercentOfLimit: number;
  };
  participants: OperationReportParticipant[];
  timeline: OperationHistoryEvent[];
};

export type BuildOperationReportInput = {
  name: string;
  status: InterventionStatus;
  occurredAt: string;
  updatedAt: string;
  location: {
    point: { type: "Point"; coordinates: [number, number] };
    label: string | null;
  } | null;
  zoneParams: ZoneParams;
  manualOverrides: {
    notes?: string;
    controlPoint?: {
      type: "Point";
      coordinates: [number, number];
    };
  } | null;
  operationDosimetry: OperationDosimetry;
  operationParticipants: OperationReportParticipantInput[];
};

function computeDurationSeconds(
  input: BuildOperationReportInput,
  now: Date,
): number | null {
  const allSessions = input.operationParticipants.flatMap(
    (participant) => participant.sessions,
  );

  if (allSessions.length === 0) {
    if (input.status === "closed") {
      const start = new Date(input.occurredAt).getTime();
      const end = new Date(input.updatedAt).getTime();
      return Math.max(0, Math.floor((end - start) / 1000));
    }
    return null;
  }

  const startMs = Math.min(
    ...allSessions.map((session) => new Date(session.startedAt).getTime()),
  );

  const hasActive = input.operationParticipants.some(
    (participant) => participant.isActive,
  );

  if (hasActive || input.status === "active") {
    return Math.max(0, Math.floor((now.getTime() - startMs) / 1000));
  }

  const endedTimes = allSessions
    .map((session) => session.endedAt)
    .filter((endedAt): endedAt is string => endedAt !== null)
    .map((endedAt) => new Date(endedAt).getTime());

  if (endedTimes.length === 0) {
    return null;
  }

  const endMs = Math.max(...endedTimes);
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function maxZoneDoseRateMsvPerHour(zoneParams: ZoneParams): number {
  return Math.max(
    doseRateMsvPerHour("I", zoneParams),
    doseRateMsvPerHour("II", zoneParams),
  );
}

function buildParticipantRows(
  participants: OperationReportParticipantInput[],
  maxOperationDose: { value: number; unit: AccumulatedDoseUnit },
  now: Date,
): OperationReportParticipant[] {
  return participants.map((participant) => {
    const totals = getSerializedParticipantTotals(
      participant.sessions,
      participant.zoneParams,
      now,
    );
    const percentOfLimit = dosePercentOfLimit(
      totals.accumulatedDoseMsv,
      maxOperationDose.value,
      maxOperationDose.unit,
    );

    return {
      userId: participant.userId,
      name: participant.name,
      team: participant.team,
      teamLabel: OPERATION_TEAM_LABELS[participant.team],
      timeInZoneSeconds: totals.timeInZoneSeconds,
      accumulatedDoseMsv: totals.accumulatedDoseMsv,
      percentOfLimit,
      riskLevel: doseRiskLevel(percentOfLimit),
    };
  });
}

export function buildOperationReport(
  input: BuildOperationReportInput,
  now: Date = new Date(),
): OperationReportSnapshot {
  const maxOperationDose = input.operationDosimetry.maxOperationDose;
  const participants = buildParticipantRows(
    input.operationParticipants,
    maxOperationDose,
    now,
  );

  const teamAccumulatedMsv = participants.reduce(
    (sum, participant) => sum + participant.accumulatedDoseMsv,
    0,
  );

  const teamPercentOfLimit = dosePercentOfLimit(
    teamAccumulatedMsv,
    maxOperationDose.value,
    maxOperationDose.unit,
  );

  const historyParticipants = input.operationParticipants.map((participant) => ({
    userId: participant.userId,
    name: participant.name,
    addedAt: participant.addedAt,
    isActive: participant.isActive,
    activeZone: participant.activeZone,
    sessions: participant.sessions,
  }));

  const notes = input.manualOverrides?.notes?.trim();

  return {
    generatedAt: now.toISOString(),
    operation: {
      name: input.name,
      status: input.status,
      occurredAt: input.occurredAt,
      durationSeconds: computeDurationSeconds(input, now),
    },
    summaryNotes: notes || null,
    location: input.location
      ? {
          label: input.location.label,
          coordinates: input.location.point.coordinates,
        }
      : null,
    controlPoint:
      input.manualOverrides?.controlPoint?.coordinates ?? null,
    zoneParams: input.zoneParams,
    dosimetry: {
      maxOperationDose,
      maxZoneDoseRateMsvPerHour: maxZoneDoseRateMsvPerHour(input.zoneParams),
      teamAccumulatedMsv,
      teamPercentOfLimit,
    },
    participants,
    timeline: buildOperationHistoryEvents(historyParticipants, now),
  };
}
