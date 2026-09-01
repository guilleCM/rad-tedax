import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getActiveSession } from "@/domain/dosimetry/computeDose";
import {
  closeParticipantActiveSession,
  stopAllActiveParticipantSessions,
} from "@/domain/dosimetry/closeActiveSessions";
import { DEFAULT_ZONE_PARAMS, type OperationParticipant } from "@/lib/types";

function makeActiveParticipant(): OperationParticipant {
  const startedAt = new Date("2026-01-01T10:00:00Z");
  return {
    userId: new ObjectId(),
    team: "search",
    addedAt: startedAt,
    sessions: [
      {
        startedAt,
        segments: [{ zone: "II", startedAt }],
        timeInZoneSeconds: 0,
        accumulatedDoseMsv: 0,
      },
    ],
  };
}

describe("stopAllActiveParticipantSessions", () => {
  it("closes active sessions for all participants", () => {
    const now = new Date("2026-01-01T10:05:00Z");
    const active = makeActiveParticipant();
    const inactive: OperationParticipant = {
      ...makeActiveParticipant(),
      userId: new ObjectId(),
      sessions: [],
    };

    const result = stopAllActiveParticipantSessions(
      [active, inactive],
      DEFAULT_ZONE_PARAMS,
      now,
    );

    expect(getActiveSession(result[0])).toBeNull();
    expect(result[0].sessions[0].endedAt).toEqual(now);
    expect(result[0].sessions[0].timeInZoneSeconds).toBeGreaterThan(0);
    expect(result[1].sessions).toHaveLength(0);
  });
});

describe("closeParticipantActiveSession", () => {
  it("returns participant unchanged when no active session", () => {
    const participant: OperationParticipant = {
      userId: new ObjectId(),
      team: "intervention",
      addedAt: new Date(),
      sessions: [],
    };

    expect(closeParticipantActiveSession(participant, DEFAULT_ZONE_PARAMS)).toBe(
      participant,
    );
  });
});
