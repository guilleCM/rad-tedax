import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppError, getIntervention } from "@/lib/services/interventions";
import { getInterventionParticipants } from "@/lib/services/users";
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
    intervention = await getIntervention(id, session.user.id, role);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const participants = await getInterventionParticipants(
    intervention.participantIds,
  );

  return <InterventionParticipantsPanel participants={participants} />;
}
