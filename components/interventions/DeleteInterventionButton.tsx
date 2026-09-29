"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/forms";

export function DeleteInterventionButton({
  interventionId,
  interventionName,
  compact = false,
}: {
  interventionId: string;
  interventionName?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (deleting) return;
    setOpen(false);
  }

  async function onDelete() {
    setDeleting(true);
    setError(null);

    const result = await apiFetch(`/api/interventions/${interventionId}`, {
      method: "DELETE",
    });

    setDeleting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const label = interventionName
    ? `Eliminar ${interventionName}`
    : "Eliminar intervención";

  return (
    <>
      {compact ? (
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-danger-foreground"
          aria-label={label}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Eliminar intervención
        </Button>
      )}

      <Dialog open={open} onClose={close} title="Eliminar intervención">
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {interventionName
              ? `¿Eliminar «${interventionName}»? Esta acción no se puede deshacer.`
              : "¿Eliminar esta intervención? Esta acción no se puede deshacer."}
          </p>
          {error && (
            <p className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={close}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void onDelete()}
              disabled={deleting}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
