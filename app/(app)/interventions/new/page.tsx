import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { countInterventions } from "@/lib/repositories/interventions";
import { canCreateIntervention } from "@/lib/services/permissions";
import { NewInterventionForm } from "@/components/interventions/NewInterventionForm";

export default async function NewInterventionPage() {
  const session = await auth();
  if (!session?.user?.id) notFound();
  if (!canCreateIntervention(session.user.role)) redirect("/");

  const count = await countInterventions();
  const defaultName = `OP_RAD_${count + 1}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nueva intervención
        </h1>
        <p className="text-sm text-muted">
          Tras crearla podrás ubicar el punto y calcular las zonas en el mapa.
        </p>
      </div>
      <NewInterventionForm defaultName={defaultName} />
    </div>
  );
}
