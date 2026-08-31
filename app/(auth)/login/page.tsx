import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Intervención Radiológica
            </h1>
            <p className="mt-1 text-sm text-muted">
              Inicia sesión para continuar
            </p>
          </div>
          <ThemeToggle />
        </div>
        <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
