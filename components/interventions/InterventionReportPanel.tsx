import Link from "next/link";
import {
  FileDown,
  MapPin,
  Radiation,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { DeleteInterventionButton } from "@/components/interventions/DeleteInterventionButton";
import { InterventionStatusBadge } from "@/components/interventions/InterventionStatusBadge";
import {
  DoseProgressBar,
  ParticipantAvatar,
} from "@/components/interventions/participant-ui";
import type { SerializedParticipant } from "@/components/interventions/InterventionParticipantsPanel";
import { Button } from "@/components/ui/forms";
import type { InterventionStatus } from "@/lib/types";
import {
  formatZoneILimit,
  formatZoneIILimit,
} from "@/lib/zones/formatDoseLimit";
import type { DoseLimitBound, ZoneIILimit } from "@/lib/types";

type SerializedIntervention = {
  id: string;
  name: string;
  status: InterventionStatus;
  occurredAt: string;
  location: {
    point: { type: "Point"; coordinates: [number, number] };
    label: string | null;
  } | null;
  zoneParams: {
    radiusZoneIMeters: number;
    radiusZoneIIMeters: number;
    limitZoneI?: DoseLimitBound;
    limitZoneII?: ZoneIILimit;
  };
  manualOverrides: {
    notes?: string;
  } | null;
};

type Props = {
  intervention: SerializedIntervention;
  participants: SerializedParticipant[];
  canDelete: boolean;
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

export function InterventionReportPanel({
  intervention,
  participants,
  canDelete,
}: Props) {
  const limitZoneI = intervention.zoneParams.limitZoneI;
  const limitZoneII = intervention.zoneParams.limitZoneII;
  const notes = intervention.manualOverrides?.notes?.trim();
  const coords = intervention.location?.point.coordinates;

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
            <dd className="mt-1 text-foreground">—</dd>
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
              {notes || defaultSummary(intervention.status)}
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
        {intervention.location ? (
          <div className="mt-3 space-y-2">
            {intervention.location.label && (
              <p className="text-sm text-foreground">
                {intervention.location.label}
              </p>
            )}
            {coords && (
              <p className="font-mono text-xs text-muted">
                {coords[1].toFixed(6)}, {coords[0].toFixed(6)}
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
              <dd className="font-medium text-foreground">10,00 mSv</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Tasa máxima registrada</dt>
              <dd className="font-medium text-foreground">—</dd>
            </div>
          </dl>
          <DoseProgressBar
            label="Dosis acumulada del equipo"
            valueLabel="0,00 mSv (0%)"
            percent={0}
            hint="Sin datos de dosimetría"
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Intervinientes
        </h3>
        {participants.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No hay intervinientes asignados.
          </p>
        ) : (
          <ul className="mt-3 flex gap-4 overflow-x-auto pb-1">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
              >
                <ParticipantAvatar name={participant.name} size="lg" />
                <p className="w-full truncate text-xs font-medium text-foreground">
                  {participant.name.split(/\s+/)[0]}
                </p>
                <p className="text-xs text-muted">—</p>
                <span className="inline-flex rounded-full bg-success px-2 py-0.5 text-[10px] font-medium text-success-foreground">
                  BAJO
                </span>
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
          disabled
          title="Próximamente"
          className="w-full"
        >
          <FileDown className="h-4 w-4" aria-hidden />
          Exportar PDF
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled
          title="Próximamente"
          className="w-full"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Compartir informe
        </Button>
      </div>

      {canDelete && (
        <DeleteInterventionButton interventionId={intervention.id} />
      )}
    </div>
  );
}
