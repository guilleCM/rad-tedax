import Link from "next/link";
import { notFound } from "next/navigation";
import { Map } from "lucide-react";
import { auth } from "@/lib/auth";
import { AppError, getIntervention } from "@/lib/services/interventions";
import {
  canDeleteIntervention,
  canUpdateInterventionByOwner,
} from "@/lib/services/permissions";
import { DeleteInterventionButton } from "@/components/interventions/DeleteInterventionButton";
import { InterventionStatusBadge } from "@/components/interventions/InterventionStatusBadge";
import { Button } from "@/components/ui/forms";

type PageProps = { params: Promise<{ id: string }> };

export default async function InterventionDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const role = session.user.role;

  let intervention;
  try {
    intervention = await getIntervention(id, session.user.id, role);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const canEdit = canUpdateInterventionByOwner(
    role,
    intervention.ownerId,
    session.user.id,
  );
  const canDelete = canDeleteIntervention(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Intervenciones
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {intervention.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{new Date(intervention.occurredAt).toLocaleString("es-ES")}</span>
            <InterventionStatusBadge status={intervention.status} />
            {!canEdit && (
              <span className="text-xs">· Solo lectura</span>
            )}
          </p>
        </div>
        <Link href={`/interventions/${intervention.id}/map`}>
          <Button type="button">
            <Map className="h-4 w-4" aria-hidden />
            {canEdit ? "Abrir mapa" : "Ver mapa"}
          </Button>
        </Link>
      </div>

      <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Ubicación
          </dt>
          <dd className="mt-1 font-mono text-sm">
            {intervention.location
              ? `${intervention.location.point.coordinates[1].toFixed(6)}, ${intervention.location.point.coordinates[0].toFixed(6)}`
              : "Sin punto seleccionado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Fórmula
          </dt>
          <dd className="mt-1 text-sm">{intervention.zoneParams.formulaVersion}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Radio Zona I
          </dt>
          <dd className="mt-1 text-sm">
            {intervention.zoneParams.radiusZoneIMeters} m
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Radio Zona II
          </dt>
          <dd className="mt-1 text-sm">
            {intervention.zoneParams.radiusZoneIIMeters} m
          </dd>
        </div>
        {intervention.manualOverrides?.notes && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted">
              Notas
            </dt>
            <dd className="mt-1 text-sm">{intervention.manualOverrides.notes}</dd>
          </div>
        )}
      </dl>

      {canDelete && (
        <DeleteInterventionButton interventionId={intervention.id} />
      )}
    </div>
  );
}
