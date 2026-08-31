"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/forms";

export function DeleteInterventionButton({
  interventionId,
}: {
  interventionId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm(
        "¿Eliminar esta intervención? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/interventions/${interventionId}`, {
      method: "DELETE",
    });

    setDeleting(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error?.message ?? "No se pudo eliminar");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="danger"
        onClick={onDelete}
        disabled={deleting}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {deleting ? "Eliminando…" : "Eliminar intervención"}
      </Button>
      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
