import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getIntervention } from "@/lib/services/interventions";
import { canUpdateInterventionByOwner } from "@/lib/services/permissions";
import { InterventionHeaderSync } from "@/components/interventions/InterventionHeaderContext";
import { InterventionTabBar } from "@/components/interventions/InterventionTabBar";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function InterventionLayout({
  children,
  params,
}: LayoutProps) {
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
    <>
      <InterventionHeaderSync
        value={{
          name: intervention.name,
          status: intervention.status,
          createdAt: intervention.createdAt,
          readOnly,
        }}
      />
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <InterventionTabBar interventionId={id} />
    </>
  );
}
