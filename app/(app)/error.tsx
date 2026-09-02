"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/forms";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="h-8 w-8 text-danger-foreground" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold text-foreground">
        Algo ha fallado
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {error.message || "Ha ocurrido un error inesperado. Inténtalo de nuevo."}
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
