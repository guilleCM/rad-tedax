"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FileDown,
  MapPin,
  Radiation,
  Share2,
  ShieldCheck,
  ClipboardCheck,
  ClipboardX,
} from "lucide-react";
import { DeleteInterventionButton } from "@/components/interventions/DeleteInterventionButton";
import { InterventionStatusBadge } from "@/components/interventions/InterventionStatusBadge";
import {
  formatDurationHms,
  formatTimeLabel,
  ZONE_UI,
} from "@/components/interventions/operation-participant-types";
import type { SerializedOperationParticipant } from "@/components/interventions/operation-participant-types";
import {
  ParticipantAvatar,
  TeamDoseProgressCard,
} from "@/components/interventions/participant-ui";
import { useLiveClock } from "@/components/interventions/useLiveClock";
import { buildOperationReport } from "@/domain/dosimetry/buildOperationReport";
import type { OperationHistoryEvent } from "@/domain/dosimetry/buildOperationHistory";
import {
  formatAccumulatedDose,
  formatAccumulatedDoseMsv,
  formatDoseValue,
} from "@/lib/dosimetry/formatOperationDose";
import { doseRiskBadgeClass } from "@/lib/dosimetry/riskLevel";
import {
  formatZoneILimit,
  formatZoneIILimit,
} from "@/lib/zones/formatDoseLimit";
import type {
  DoseLimitBound,
  InterventionStatus,
  OperationDosimetry,
  ZoneIILimit,
  ZoneParams,
} from "@/lib/types";
import { Button } from "@/components/ui/forms";

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
  onExportPdf: () => Promise<void>;
};

function defaultSummary(status: InterventionStatus): string {
  if (status === "closed") {
    return "Operación cerrada. Sin incidencias registradas en el informe.";
  }
  if (status === "active") {
    return "Operación en curso. Informe preliminar con datos disponibles.";
  }
  return "Operación en borrador. Complete la zonificación y el seguimiento del equipo.";
}

function formatMaxDoseRate(rateMsvPerHour: number): string {
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rateMsvPerHour >= 1 ? rateMsvPerHour : rateMsvPerHour * 1000);
  return rateMsvPerHour >= 1
    ? `${formatted} mSv/h`
    : `${formatted} µSv/h`;
}

function describeTimelineEvent(event: OperationHistoryEvent): string {
  switch (event.type) {
    case "participant_added":
      return "Añadido a la operación";
    case "session_start":
      return `Entrada en ${ZONE_UI[event.zone!].label}`;
    case "zone_change":
      return `Cambio a ${ZONE_UI[event.zone!].label}`;
    case "session_end":
      return `Salida de zona · ${formatDurationHms(event.durationSeconds ?? 0)} · ${formatAccumulatedDoseMsv(event.doseMsv ?? 0)}`;
    case "session_active":
      return `En zona · ${ZONE_UI[event.zone!].label}`;
  }
}

export function InterventionReportView({
  intervention,
  canDelete,
  onExportPdf,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const hasActiveSessions = intervention.operationParticipants.some(
    (participant) => participant.isActive,
  );
  const now = useLiveClock(hasActiveSessions);

  const report = useMemo(
    () =>
      buildOperationReport(
        {
          name: intervention.name,
          status: intervention.status,
          occurredAt: intervention.occurredAt,
          updatedAt: intervention.updatedAt,
          location: intervention.location,
          zoneParams: intervention.zoneParams,
          manualOverrides: intervention.manualOverrides,
          operationDosimetry: intervention.operationDosimetry,
          operationParticipants: intervention.operationParticipants,
        },
        now,
      ),
    [intervention, now],
  );

  const limitZoneI = intervention.zoneParams.limitZoneI;
  const limitZoneII = intervention.zoneParams.limitZoneII;
  const coords = report.location?.coordinates;

  async function handleExportPdf() {
    setExporting(true);
    try {
      await onExportPdf();
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (shareFeedback === "idle") return;
    const id = window.setTimeout(() => setShareFeedback("idle"), 1500);
    return () => window.clearTimeout(id);
  }, [shareFeedback]);

  async function handleShareReport() {
    const url = `${window.location.origin}/interventions/${intervention.id}/informe`;
    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback("copied");
    } catch {
      setShareFeedback("error");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Operación
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {intervention.name}
            </h2>
          </div>
          <InterventionStatusBadge status={intervention.status} />
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Fecha</dt>
            <dd className="mt-1 text-foreground">
              {new Date(intervention.occurredAt).toLocaleString("es-ES")}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">
              Duración
            </dt>
            <dd className="mt-1 text-foreground">
              {report.operation.durationSeconds !== null
                ? formatDurationHms(report.operation.durationSeconds)
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-success-foreground"
            aria-hidden
          />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Resumen de operación
            </h3>
            <p className="mt-2 text-sm text-muted">
              {report.summaryNotes || defaultSummary(intervention.status)}
            </p>
            <p className="mt-2 inline-flex rounded-full bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
              Sin incidencias
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4" aria-hidden />
          Ubicación
        </h3>
        {report.location ? (
          <div className="mt-3 space-y-2">
            {report.location.label && (
              <p className="text-sm text-foreground">{report.location.label}</p>
            )}
            {coords && (
              <p className="font-mono text-xs text-muted">
                {coords[1].toFixed(6)}, {coords[0].toFixed(6)}
              </p>
            )}
            {report.controlPoint && (
              <p className="text-sm text-muted">
                Punto de control:{" "}
                <span className="font-mono text-xs text-foreground">
                  {report.controlPoint[1].toFixed(6)},{" "}
                  {report.controlPoint[0].toFixed(6)}
                </span>
              </p>
            )}
            <Link
              href={`/interventions/${intervention.id}/map`}
              className="inline-block text-sm font-medium text-accent underline"
            >
              Ver en mapa
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Sin ubicación registrada.</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Radiation className="h-4 w-4" aria-hidden />
          Cinturones establecidos
        </h3>
        <ul className="mt-3 space-y-3">
          <li className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-foreground">
                Zona I — Medidas Urgentes
              </p>
              {limitZoneI && (
                <p className="text-xs text-muted">
                  {formatZoneILimit(limitZoneI)}
                </p>
              )}
            </div>
            <span className="shrink-0 text-muted">
              {intervention.zoneParams.radiusZoneIMeters} m
            </span>
          </li>
          <li className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-foreground">Zona II — Alerta</p>
              {limitZoneII && (
                <p className="text-xs text-muted">
                  {formatZoneIILimit(limitZoneII)}
                </p>
              )}
            </div>
            <span className="shrink-0 text-muted">
              {intervention.zoneParams.radiusZoneIIMeters} m
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Mediciones clave
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted">Dosis máx. permitida</dt>
              <dd className="font-medium text-foreground">
                {formatAccumulatedDose(
                  report.dosimetry.maxOperationDose.value,
                  report.dosimetry.maxOperationDose.unit,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Tasa máx. de referencia</dt>
              <dd className="font-medium text-foreground">
                {formatMaxDoseRate(report.dosimetry.maxZoneDoseRateMsvPerHour)}
              </dd>
            </div>
          </dl>
          <TeamDoseProgressCard
            accumulatedMsv={report.dosimetry.teamAccumulatedMsv}
            maxValue={report.dosimetry.maxOperationDose.value}
            maxUnit={report.dosimetry.maxOperationDose.unit}
            percent={report.dosimetry.teamPercentOfLimit}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Intervinientes
        </h3>
        {report.participants.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No hay intervinientes asignados.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {report.participants.map((participant) => (
              <li
                key={participant.userId}
                className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
              >
                <ParticipantAvatar name={participant.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {participant.name}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${doseRiskBadgeClass(participant.riskLevel)}`}
                    >
                      {participant.riskLevel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {participant.teamLabel}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatAccumulatedDoseMsv(participant.accumulatedDoseMsv)}{" "}
                    · {formatDurationHms(participant.timeInZoneSeconds)} en
                    zona · {formatDoseValue(participant.percentOfLimit)}% del
                    límite
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Cronología</h3>
        {report.timeline.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Aún no hay registros en esta operación.
          </p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {report.timeline.map((event, index) => (
              <li
                key={`${event.type}-${event.at}-${event.userId}-${index}`}
                className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
              >
                <span className="shrink-0 pt-0.5 font-mono text-xs text-muted">
                  {formatTimeLabel(event.at)}
                </span>
                <ParticipantAvatar name={event.participantName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {event.participantName}
                  </p>
                  <p className="text-xs text-muted">
                    {describeTimelineEvent(event)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Incidencias</h3>
        <p className="mt-3 text-sm text-muted">
          Sin incidencias registradas.
        </p>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={exporting}
          onClick={() => void handleExportPdf()}
        >
          <FileDown className="h-4 w-4" aria-hidden />
          {exporting ? "Generando PDF…" : "Exportar PDF"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => void handleShareReport()}
          aria-live="polite"
        >
          {shareFeedback === "copied" ? (
            <ClipboardCheck className="h-4 w-4" aria-hidden />
          ) : shareFeedback === "error" ? (
            <ClipboardX className="h-4 w-4" aria-hidden />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden />
          )}
          {shareFeedback === "copied"
            ? "URL copiada"
            : shareFeedback === "error"
              ? "No se pudo copiar"
              : "Compartir informe"}
        </Button>
      </div>

      {canDelete && (
        <DeleteInterventionButton interventionId={intervention.id} />
      )}
    </div>
  );
}
