"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flag } from "lucide-react";
import { usePatchInterventionHeader } from "@/components/interventions/InterventionHeaderContext";
import { Button } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";
import type { InterventionStatus } from "@/lib/types";

type Props = {
  interventionId: string;
  status: InterventionStatus;
  readOnly?: boolean;
  hasActiveSessions?: boolean;
  onClosed?: () => void;
};

export function FinalizeOperationButton({
  interventionId,
  status,
  readOnly = false,
  hasActiveSessions = false,
  onClosed,
}: Props) {
  const router = useRouter();
  const patchHeader = usePatchInterventionHeader();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (readOnly || status === "closed") {
    return null;
  }

  async function handleClose() {
    setClosing(true);
    setError(null);

    const res = await fetch(`/api/interventions/${interventionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });

    const json = await res.json();
    setClosing(false);

    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo finalizar la operación");
      return;
    }

    setOpen(false);
    patchHeader({ status: "closed" });
    onClosed?.();
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        className="w-full"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Flag className="h-4 w-4" aria-hidden />
        Finalizar operación
      </Button>

      <Dialog
        open={open}
        onClose={() => !closing && setOpen(false)}
        title="Finalizar operación"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {hasActiveSessions
              ? "Se detendrán las sesiones activas y la operación quedará cerrada. No podrás volver a iniciar sesiones de intervinientes."
              : "La operación quedará cerrada. No podrás volver a iniciar sesiones de intervinientes."}
          </p>

          {error && (
            <p className="text-sm text-danger-foreground">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={closing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void handleClose()}
              disabled={closing}
            >
              {closing ? "Finalizando…" : "Finalizar operación"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
