import type { ActiveZone } from "@/lib/types";

export type OperationHistoryEventType =
  | "participant_added"
  | "session_start"
  | "zone_change"
  | "session_end"
  | "session_active";

export type OperationHistoryEvent = {
  at: string;
  userId: string;
  participantName: string;
  type: OperationHistoryEventType;
  zone?: ActiveZone;
  durationSeconds?: number;
  doseMsv?: number;
};

export type OperationHistoryParticipant = {
  userId: string;
  name: string;
  addedAt: string;
  isActive: boolean;
  activeZone: ActiveZone | null;
  sessions: Array<{
    startedAt: string;
    endedAt: string | null;
    segments: Array<{
      zone: ActiveZone;
      startedAt: string;
      endedAt: string | null;
    }>;
    timeInZoneSeconds: number;
    accumulatedDoseMsv: number;
  }>;
};

export function buildOperationHistoryEvents(
  participants: OperationHistoryParticipant[],
  now: Date = new Date(),
): OperationHistoryEvent[] {
  const events: OperationHistoryEvent[] = [];

  for (const participant of participants) {
    events.push({
      at: participant.addedAt,
      userId: participant.userId,
      participantName: participant.name,
      type: "participant_added",
    });

    for (const session of participant.sessions) {
      const firstSegment = session.segments[0];
      if (firstSegment) {
        events.push({
          at: session.startedAt,
          userId: participant.userId,
          participantName: participant.name,
          type: "session_start",
          zone: firstSegment.zone,
        });
      }

      for (let index = 1; index < session.segments.length; index++) {
        const segment = session.segments[index];
        events.push({
          at: segment.startedAt,
          userId: participant.userId,
          participantName: participant.name,
          type: "zone_change",
          zone: segment.zone,
        });
      }

      if (session.endedAt) {
        events.push({
          at: session.endedAt,
          userId: participant.userId,
          participantName: participant.name,
          type: "session_end",
          durationSeconds: session.timeInZoneSeconds,
          doseMsv: session.accumulatedDoseMsv,
        });
      } else if (participant.isActive) {
        const activeZone =
          participant.activeZone ??
          session.segments[session.segments.length - 1]?.zone;
        events.push({
          at: now.toISOString(),
          userId: participant.userId,
          participantName: participant.name,
          type: "session_active",
          zone: activeZone ?? undefined,
        });
      }
    }
  }

  return events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
