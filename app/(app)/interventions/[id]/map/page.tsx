import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppError, getIntervention } from "@/lib/services/interventions";
import { InterventionMapPanel } from "@/components/interventions/InterventionMapPanel";

type PageProps = { params: Promise<{ id: string }> };

export default async function InterventionMapPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;

  let intervention;
  try {
    intervention = await getIntervention(id, session.user.id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/interventions/${intervention.id}`}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Detalle
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Mapa · {intervention.name}
        </h1>
      </div>
      <InterventionMapPanel intervention={intervention} />
    </div>
  );
}
