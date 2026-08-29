import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Intervención Radiológica
        </h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Inicia sesión para continuar
        </p>
        <Suspense fallback={<p className="text-sm text-slate-500">Cargando…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
