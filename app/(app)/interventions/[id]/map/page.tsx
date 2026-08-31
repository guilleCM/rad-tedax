import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppError, getIntervention } from "@/lib/services/interventions";
import { canUpdateInterventionByOwner } from "@/lib/services/permissions";
import { InterventionMapPanel } from "@/components/interventions/InterventionMapPanel";
import { InterventionStatusBadge } from "@/components/interventions/InterventionStatusBadge";

type PageProps = { params: Promise<{ id: string }> };

export default async function InterventionMapPage({ params }: PageProps) {
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
console.log('intervention', intervention);
  const readOnly = !canUpdateInterventionByOwner(
    role,
    intervention.ownerId,
    session.user.id,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-base tracking-tight">
          <span className="font-semibold">Operación:</span><span>{intervention.name}</span>
          <InterventionStatusBadge status={intervention.status} />
          {readOnly && (
            <span className="text-sm font-normal text-muted">(solo lectura)</span>
          )}
        </h1>
        {intervention.createdAt && (
          <p className="text-sm font-normal text-muted">
            {new Date(intervention.createdAt).toLocaleString()}
          </p>
        )}
      </div>
      <InterventionMapPanel intervention={intervention} readOnly={readOnly} />
    </div>
  );
}
