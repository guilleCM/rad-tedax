import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  AppError,
  getInterventionWithOperationParticipants,
} from "@/lib/services/interventions";
import { canUpdateInterventionByOwner } from "@/lib/services/permissions";
import { InterventionParticipantsPanel } from "@/components/interventions/InterventionParticipantsPanel";

type PageProps = { params: Promise<{ id: string }> };

export default async function InterventionParticipantsPage({
  params,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const role = session.user.role;

  let intervention;
  try {
    intervention = await getInterventionWithOperationParticipants(
      id,
      session.user.id,
      role,
    );
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
    <InterventionParticipantsPanel
      interventionId={intervention.id}
      interventionStatus={intervention.status}
      operationDosimetry={intervention.operationDosimetry}
      operationParticipants={intervention.operationParticipants}
      readOnly={readOnly}
    />
  );
}
