import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { canCreateIntervention } from "@/lib/services/permissions";
import { listInterventions } from "@/lib/services/interventions";
import { InterventionStatusBadge } from "@/components/interventions/InterventionStatusBadge";
import { Button } from "@/components/ui/forms";

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role ?? "participant";
  const canCreate = canCreateIntervention(role);

  let interventions: Awaited<ReturnType<typeof listInterventions>> = [];
  let loadError: string | null = null;

  if (session?.user?.id) {
    try {
      interventions = await listInterventions(session.user.id, role);
    } catch {
      loadError =
        "No se pudo conectar con MongoDB. Revisa MONGODB_URI y ejecuta npm run seed.";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Intervenciones</h1>
          <p className="text-sm text-muted">
            Gestiona y localiza intervenciones radiológicas
          </p>
        </div>
        {canCreate && (
          <Link href="/interventions/new">
            <Button type="button">
              <Plus className="h-4 w-4" aria-hidden />
              Nueva intervención
            </Button>
          </Link>
        )}
      </div>

      {loadError && (
        <p className="rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
          {loadError}
        </p>
      )}

      {!loadError && interventions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted" aria-hidden />
          <p className="mt-3 text-muted">Aún no hay intervenciones.</p>
          {canCreate && (
            <Link
              href="/interventions/new"
              className="mt-3 inline-block text-sm font-medium text-accent underline"
            >
              Crear la primera
            </Link>
          )}
        </div>
      ) : null}

      {interventions.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {interventions.map((item) => (
            <li key={item.id}>
              <Link
                href={`/interventions/${item.id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>
                      {new Date(item.occurredAt).toLocaleString("es-ES")}
                    </span>
                    <InterventionStatusBadge status={item.status} />
                  </p>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {item.location
                    ? `${item.location.point.coordinates[1].toFixed(4)}, ${item.location.point.coordinates[0].toFixed(4)}`
                    : "Sin ubicación"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
