import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  isFirstOperationPlay,
  shouldActivateIntervention,
} from "@/domain/dosimetry/operationActivation";
import type { OperationParticipant } from "@/lib/types";

function makeParticipant(sessionsCount: number): OperationParticipant {
  return {
    userId: new ObjectId(),
    team: "search",
    addedAt: new Date(),
    sessions: Array.from({ length: sessionsCount }, () => ({
      startedAt: new Date(),
      endedAt: new Date(),
      segments: [],
      timeInZoneSeconds: 0,
      accumulatedDoseMsv: 0,
    })),
  };
}

describe("isFirstOperationPlay", () => {
  it("returns true when no participant has sessions", () => {
    expect(isFirstOperationPlay([makeParticipant(0), makeParticipant(0)])).toBe(
      true,
    );
  });

  it("returns false when any participant has sessions", () => {
    expect(isFirstOperationPlay([makeParticipant(0), makeParticipant(1)])).toBe(
      false,
    );
  });
});

describe("shouldActivateIntervention", () => {
  it("activates draft on first play", () => {
    expect(shouldActivateIntervention("draft", [makeParticipant(0)])).toBe(true);
  });

  it("does not activate when not draft", () => {
    expect(shouldActivateIntervention("active", [makeParticipant(0)])).toBe(
      false,
    );
  });

  it("does not activate when sessions already exist", () => {
    expect(shouldActivateIntervention("draft", [makeParticipant(1)])).toBe(
      false,
    );
  });
});
