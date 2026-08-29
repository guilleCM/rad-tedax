import Link from "next/link";
import { auth } from "@/lib/auth";
import { listInterventions } from "@/lib/services/interventions";
import { Button } from "@/components/ui/forms";

export default async function DashboardPage() {
  const session = await auth();

  let interventions: Awaited<ReturnType<typeof listInterventions>> = [];
  let loadError: string | null = null;

  if (session?.user?.id) {
    try {
      interventions = await listInterventions(session.user.id);
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
          <p className="text-sm text-slate-500">
            Gestiona y localiza intervenciones radiológicas
          </p>
        </div>
        <Link href="/interventions/new">
          <Button type="button">Nueva intervención</Button>
        </Link>
      </div>

      {loadError && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {loadError}
        </p>
      )}

      {!loadError && interventions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">Aún no hay intervenciones.</p>
          <Link
            href="/interventions/new"
            className="mt-3 inline-block text-sm font-medium text-slate-900 underline"
          >
            Crear la primera
          </Link>
        </div>
      ) : null}

      {interventions.length > 0 ? (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {interventions.map((item) => (
            <li key={item.id}>
              <Link
                href={`/interventions/${item.id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(item.occurredAt).toLocaleString("es-ES")} ·{" "}
                    {item.status}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
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
