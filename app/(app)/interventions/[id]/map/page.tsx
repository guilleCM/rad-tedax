import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppError, getIntervention } from "@/lib/services/interventions";
import { canUpdateInterventionByOwner } from "@/lib/services/permissions";
import { InterventionMapPanel } from "@/components/interventions/InterventionMapPanel";

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

  const readOnly = !canUpdateInterventionByOwner(
    role,
    intervention.ownerId,
    session.user.id,
  );

  return (
    <InterventionMapPanel
      intervention={intervention}
      interventionStatus={intervention.status}
      readOnly={readOnly}
    />
  );
}
