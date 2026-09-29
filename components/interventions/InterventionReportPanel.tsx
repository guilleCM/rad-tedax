"use client";

import { useCallback, useMemo, useRef } from "react";
import type { SerializedOperationParticipant } from "@/components/interventions/operation-participant-types";
import { InterventionReportView } from "@/components/interventions/InterventionReportView";
import {
  InterventionMapSnapshot,
  type InterventionMapSnapshotHandle,
} from "@/components/map/InterventionMapSnapshot";
import { buildOperationReport } from "@/domain/dosimetry/buildOperationReport";
import { exportOperationReportPdf } from "@/lib/reports/exportOperationReportPdf";
import { tacticalPointsFromOverrides } from "@/lib/map/tacticalPoints";
import { sketchesFromOverrides } from "@/lib/map/sketches";
import type {
  DoseLimitBound,
  InterventionStatus,
  MapSketch,
  OperationDosimetry,
  ZoneIILimit,
  ZoneParams,
} from "@/lib/types";

type SerializedIntervention = {
  id: string;
  name: string;
  status: InterventionStatus;
  occurredAt: string;
  updatedAt: string;
  location: {
    point: { type: "Point"; coordinates: [number, number] };
    label: string | null;
  } | null;
  zoneParams: {
    radiusZoneIMeters: number;
    radiusZoneIIMeters: number;
    limitZoneI?: DoseLimitBound;
    limitZoneII?: ZoneIILimit;
  } & ZoneParams;
  manualOverrides: {
    notes?: string;
    controlPoint?: {
      type: "Point";
      coordinates: [number, number];
    };
    decontaminationStation?: {
      type: "Point";
      coordinates: [number, number];
    };
    advancedCommandPost?: {
      type: "Point";
      coordinates: [number, number];
    };
    entryExit?: {
      type: "Point";
      coordinates: [number, number];
    };
    alertReading?: {
      type: "Point";
      coordinates: [number, number];
    };
    sketches?: MapSketch[];
  } | null;
  operationDosimetry: OperationDosimetry;
  operationParticipants: SerializedOperationParticipant[];
};

type Props = {
  intervention: SerializedIntervention;
  canDelete: boolean;
};

export function InterventionReportPanel({
  intervention,
  canDelete,
}: Props) {
  const mapSnapshotRef = useRef<InterventionMapSnapshotHandle>(null);
  const reportInput = useMemo(
    () => ({
      name: intervention.name,
      status: intervention.status,
      occurredAt: intervention.occurredAt,
      updatedAt: intervention.updatedAt,
      location: intervention.location,
      zoneParams: intervention.zoneParams,
      manualOverrides: intervention.manualOverrides,
      operationDosimetry: intervention.operationDosimetry,
      operationParticipants: intervention.operationParticipants,
    }),
    [intervention],
  );

  const handleExportPdf = useCallback(async () => {
    const mapImageDataUrl = intervention.location
      ? (await mapSnapshotRef.current?.capture()) ?? null
      : null;
    const report = buildOperationReport(reportInput);
    await exportOperationReportPdf(report, intervention.id, {
      mapImageDataUrl,
    });
  }, [intervention.id, intervention.location, reportInput]);

  const mapCoordinates = intervention.location?.point.coordinates ?? null;

  return (
    <>
      {mapCoordinates && (
        <InterventionMapSnapshot
          ref={mapSnapshotRef}
          coordinates={mapCoordinates}
          tacticalPoints={tacticalPointsFromOverrides(
            intervention.manualOverrides,
          )}
          alertReading={
            intervention.manualOverrides?.alertReading?.coordinates ?? null
          }
          radiusZoneIMeters={intervention.zoneParams.radiusZoneIMeters}
          radiusZoneIIMeters={intervention.zoneParams.radiusZoneIIMeters}
          sketches={sketchesFromOverrides(intervention.manualOverrides)}
        />
      )}
      <InterventionReportView
        intervention={intervention}
        canDelete={canDelete}
        onExportPdf={handleExportPdf}
      />
    </>
  );
}
