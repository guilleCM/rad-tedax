import Link from "next/link";
import { NewInterventionForm } from "@/components/interventions/NewInterventionForm";

export default function NewInterventionPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nueva intervención
        </h1>
        <p className="text-sm text-slate-500">
          Tras crearla podrás ubicar el punto y calcular las zonas en el mapa.
        </p>
      </div>
      <NewInterventionForm />
    </div>
  );
}
