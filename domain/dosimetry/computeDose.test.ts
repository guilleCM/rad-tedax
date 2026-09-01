import { describe, expect, it } from "vitest";
import {
  computeSegmentDose,
  computeSessionTotals,
  doseRateMsvPerHour,
  doseUnitToMsvPerHour,
  getParticipantTotals,
  isParticipantActive,
} from "./computeDose";
import { DEFAULT_ZONE_PARAMS } from "@/lib/types";
import type { OperationParticipant } from "@/lib/types";
import { ObjectId } from "mongodb";

describe("doseUnitToMsvPerHour", () => {
  it("converts uSv/h to mSv/h", () => {
    expect(doseUnitToMsvPerHour(100, "uSv/h")).toBe(0.1);
  });

  it("keeps mSv/h unchanged", () => {
    expect(doseUnitToMsvPerHour(5, "mSv/h")).toBe(5);
  });
});

describe("doseRateMsvPerHour", () => {
  it("uses limitZoneI for zone I", () => {
    expect(doseRateMsvPerHour("I", DEFAULT_ZONE_PARAMS)).toBe(5);
  });

  it("uses limitZoneII.lower for zone II", () => {
    expect(doseRateMsvPerHour("II", DEFAULT_ZONE_PARAMS)).toBe(0.1);
  });
});

describe("computeSegmentDose", () => {
  it("computes dose from rate and time", () => {
    expect(computeSegmentDose(3600, 5)).toBe(5);
    expect(computeSegmentDose(1800, 4)).toBe(2);
  });
});

describe("computeSessionTotals", () => {
  it("sums closed and open segments", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const endedAt = new Date("2026-01-01T11:00:00Z");
    const now = new Date("2026-01-01T12:00:00Z");

    const totals = computeSessionTotals(
      [
        { zone: "II", startedAt, endedAt },
        { zone: "I", startedAt: endedAt, endedAt: now },
      ],
      DEFAULT_ZONE_PARAMS,
      now,
    );

    expect(totals.timeInZoneSeconds).toBe(7200);
    expect(totals.accumulatedDoseMsv).toBeCloseTo(5.1, 5);
  });

  it("recalculates dose after mid-session zone change from II to I", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const zoneChangeAt = new Date("2026-01-01T10:30:00Z");
    const now = new Date("2026-01-01T11:00:00Z");

    const totals = computeSessionTotals(
      [
        { zone: "II", startedAt, endedAt: zoneChangeAt },
        { zone: "I", startedAt: zoneChangeAt },
      ],
      DEFAULT_ZONE_PARAMS,
      now,
    );

    expect(totals.timeInZoneSeconds).toBe(3600);
    // 30 min @ 0.1 mSv/h + 30 min @ 5 mSv/h = 0.05 + 2.5 mSv
    expect(totals.accumulatedDoseMsv).toBeCloseTo(2.55, 5);
  });
});

describe("isParticipantActive", () => {
  const base: OperationParticipant = {
    userId: new ObjectId(),
    team: "search",
    addedAt: new Date(),
    sessions: [],
  };

  it("returns false with no sessions", () => {
    expect(isParticipantActive(base)).toBe(false);
  });

  it("returns true when last session is open", () => {
    const participant: OperationParticipant = {
      ...base,
      sessions: [
        {
          startedAt: new Date(),
          segments: [{ zone: "I", startedAt: new Date() }],
          timeInZoneSeconds: 0,
          accumulatedDoseMsv: 0,
        },
      ],
    };
    expect(isParticipantActive(participant)).toBe(true);
  });
});

describe("getParticipantTotals", () => {
  it("includes live session totals", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const endedAt = new Date("2026-01-01T11:00:00Z");
    const now = new Date("2026-01-01T12:30:00Z");

    const participant: OperationParticipant = {
      userId: new ObjectId(),
      team: "intervention",
      addedAt: startedAt,
      sessions: [
        {
          startedAt,
          endedAt,
          segments: [{ zone: "II", startedAt, endedAt }],
          timeInZoneSeconds: 3600,
          accumulatedDoseMsv: 0.1,
        },
        {
          startedAt: endedAt,
          segments: [{ zone: "I", startedAt: endedAt }],
          timeInZoneSeconds: 0,
          accumulatedDoseMsv: 0,
        },
      ],
    };

    const totals = getParticipantTotals(participant, DEFAULT_ZONE_PARAMS, now);
    expect(totals.timeInZoneSeconds).toBe(3600 + 5400);
    expect(totals.accumulatedDoseMsv).toBeCloseTo(0.1 + 7.5, 5);
  });
});
