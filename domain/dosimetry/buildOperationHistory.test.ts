import { describe, expect, it } from "vitest";
import { buildOperationHistoryEvents } from "./buildOperationHistory";
import type { OperationHistoryParticipant } from "./buildOperationHistory";

const baseParticipant: OperationHistoryParticipant = {
  userId: "user-a",
  name: "Ana García",
  addedAt: "2026-01-01T08:00:00.000Z",
  isActive: false,
  activeZone: null,
  sessions: [],
};

describe("buildOperationHistoryEvents", () => {
  it("returns only participant_added when there are no sessions", () => {
    const events = buildOperationHistoryEvents([baseParticipant]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "participant_added",
      participantName: "Ana García",
      at: "2026-01-01T08:00:00.000Z",
    });
  });

  it("builds session start, zone change and session end events", () => {
    const participant: OperationHistoryParticipant = {
      ...baseParticipant,
      sessions: [
        {
          startedAt: "2026-01-01T09:00:00.000Z",
          endedAt: "2026-01-01T10:30:00.000Z",
          segments: [
            {
              zone: "II",
              startedAt: "2026-01-01T09:00:00.000Z",
              endedAt: "2026-01-01T09:45:00.000Z",
            },
            {
              zone: "I",
              startedAt: "2026-01-01T09:45:00.000Z",
              endedAt: "2026-01-01T10:30:00.000Z",
            },
          ],
          timeInZoneSeconds: 5400,
          accumulatedDoseMsv: 2.5,
        },
      ],
    };

    const events = buildOperationHistoryEvents([participant]);
    const types = events.map((event) => event.type);

    expect(types).toEqual([
      "session_end",
      "zone_change",
      "session_start",
      "participant_added",
    ]);
    expect(events.find((event) => event.type === "session_end")).toMatchObject({
      durationSeconds: 5400,
      doseMsv: 2.5,
    });
    expect(events.find((event) => event.type === "zone_change")).toMatchObject({
      zone: "I",
    });
  });

  it("adds session_active for open sessions", () => {
    const now = new Date("2026-01-01T11:00:00.000Z");
    const participant: OperationHistoryParticipant = {
      ...baseParticipant,
      isActive: true,
      activeZone: "II",
      sessions: [
        {
          startedAt: "2026-01-01T10:00:00.000Z",
          endedAt: null,
          segments: [
            {
              zone: "II",
              startedAt: "2026-01-01T10:00:00.000Z",
              endedAt: null,
            },
          ],
          timeInZoneSeconds: 0,
          accumulatedDoseMsv: 0,
        },
      ],
    };

    const events = buildOperationHistoryEvents([participant], now);
    const active = events.find((event) => event.type === "session_active");

    expect(active).toMatchObject({
      zone: "II",
      at: now.toISOString(),
    });
  });

  it("merges and sorts events from multiple participants", () => {
    const participants: OperationHistoryParticipant[] = [
      baseParticipant,
      {
        ...baseParticipant,
        userId: "user-b",
        name: "Bruno López",
        addedAt: "2026-01-01T08:30:00.000Z",
      },
    ];

    const events = buildOperationHistoryEvents(participants);

    expect(events.map((event) => event.at)).toEqual([
      "2026-01-01T08:30:00.000Z",
      "2026-01-01T08:00:00.000Z",
    ]);
  });
});
