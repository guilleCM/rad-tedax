"use client";

import { useCallback, useMemo } from "react";
import type { SerializedOperationParticipant } from "@/components/interventions/operation-participant-types";
import { InterventionReportView } from "@/components/interventions/InterventionReportView";
import { buildOperationReport } from "@/domain/dosimetry/buildOperationReport";
import { exportOperationReportPdf } from "@/lib/reports/exportOperationReportPdf";
import type {
  DoseLimitBound,
  InterventionStatus,
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
    const report = buildOperationReport(reportInput);
    await exportOperationReportPdf(report, intervention.id);
  }, [intervention.id, reportInput]);

  return (
    <InterventionReportView
      intervention={intervention}
      canDelete={canDelete}
      onExportPdf={handleExportPdf}
    />
  );
}
