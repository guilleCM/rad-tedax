import { describe, expect, it } from "vitest";
import { buildOperationReport } from "./buildOperationReport";
import type { BuildOperationReportInput } from "./buildOperationReport";
import {
  DEFAULT_OPERATION_DOSIMETRY,
  DEFAULT_ZONE_PARAMS,
} from "@/lib/types";

const baseInput: BuildOperationReportInput = {
  name: "Operación demo",
  status: "draft",
  occurredAt: "2026-01-01T08:00:00.000Z",
  updatedAt: "2026-01-01T18:00:00.000Z",
  location: null,
  zoneParams: DEFAULT_ZONE_PARAMS,
  manualOverrides: null,
  operationDosimetry: DEFAULT_OPERATION_DOSIMETRY,
  operationParticipants: [],
};

describe("buildOperationReport", () => {
  it("returns empty duration and zero totals when there are no sessions", () => {
    const report = buildOperationReport(baseInput);

    expect(report.operation.durationSeconds).toBeNull();
    expect(report.dosimetry.teamAccumulatedMsv).toBe(0);
    expect(report.dosimetry.teamPercentOfLimit).toBe(0);
    expect(report.participants).toEqual([]);
    expect(report.timeline).toEqual([]);
  });

  it("computes duration for closed operation without sessions from occurredAt to updatedAt", () => {
    const report = buildOperationReport({
      ...baseInput,
      status: "closed",
    });

    expect(report.operation.durationSeconds).toBe(10 * 3600);
  });

  it("computes duration from first session start to last session end", () => {
    const report = buildOperationReport(
      {
        ...baseInput,
        status: "closed",
        operationParticipants: [
          {
            userId: "user-a",
            name: "Ana García",
            team: "intervention",
            addedAt: "2026-01-01T08:00:00.000Z",
            isActive: false,
            activeZone: null,
            zoneParams: DEFAULT_ZONE_PARAMS,
            sessions: [
              {
                startedAt: "2026-01-01T09:00:00.000Z",
                endedAt: "2026-01-01T10:00:00.000Z",
                segments: [
                  {
                    zone: "II",
                    startedAt: "2026-01-01T09:00:00.000Z",
                    endedAt: "2026-01-01T10:00:00.000Z",
                  },
                ],
                timeInZoneSeconds: 3600,
                accumulatedDoseMsv: 0.1,
              },
            ],
          },
          {
            userId: "user-b",
            name: "Bruno López",
            team: "search",
            addedAt: "2026-01-01T08:30:00.000Z",
            isActive: false,
            activeZone: null,
            zoneParams: DEFAULT_ZONE_PARAMS,
            sessions: [
              {
                startedAt: "2026-01-01T09:30:00.000Z",
                endedAt: "2026-01-01T11:00:00.000Z",
                segments: [
                  {
                    zone: "I",
                    startedAt: "2026-01-01T09:30:00.000Z",
                    endedAt: "2026-01-01T11:00:00.000Z",
                  },
                ],
                timeInZoneSeconds: 5400,
                accumulatedDoseMsv: 7.5,
              },
            ],
          },
        ],
      },
      new Date("2026-01-01T12:00:00.000Z"),
    );

    expect(report.operation.durationSeconds).toBe(2 * 3600);
    expect(report.dosimetry.teamAccumulatedMsv).toBeCloseTo(7.6, 5);
    expect(report.participants).toHaveLength(2);
    expect(report.timeline.length).toBeGreaterThan(0);
  });

  it("uses now for active operations with open sessions", () => {
    const now = new Date("2026-01-01T10:30:00.000Z");
    const report = buildOperationReport(
      {
        ...baseInput,
        status: "active",
        operationParticipants: [
          {
            userId: "user-a",
            name: "Ana García",
            team: "intervention",
            addedAt: "2026-01-01T08:00:00.000Z",
            isActive: true,
            activeZone: "II",
            zoneParams: DEFAULT_ZONE_PARAMS,
            sessions: [
              {
                startedAt: "2026-01-01T09:00:00.000Z",
                endedAt: null,
                segments: [
                  {
                    zone: "II",
                    startedAt: "2026-01-01T09:00:00.000Z",
                    endedAt: null,
                  },
                ],
                timeInZoneSeconds: 0,
                accumulatedDoseMsv: 0,
              },
            ],
          },
        ],
      },
      now,
    );

    expect(report.operation.durationSeconds).toBe(5400);
    expect(report.dosimetry.teamAccumulatedMsv).toBeGreaterThan(0);
    expect(report.timeline.some((event) => event.type === "session_active")).toBe(
      true,
    );
  });

  it("derives max zone dose rate from zone params", () => {
    const report = buildOperationReport(baseInput);

    expect(report.dosimetry.maxZoneDoseRateMsvPerHour).toBe(5);
  });

  it("includes control point and summary notes when present", () => {
    const report = buildOperationReport({
      ...baseInput,
      manualOverrides: {
        notes: "  Revisión completada  ",
        controlPoint: {
          type: "Point",
          coordinates: [2.17, 41.38],
        },
      },
    });

    expect(report.summaryNotes).toBe("Revisión completada");
    expect(report.controlPoint).toEqual([2.17, 41.38]);
  });
});
