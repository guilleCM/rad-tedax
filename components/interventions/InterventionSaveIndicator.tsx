"use client";

import { Loader2, Save } from "lucide-react";
import { useInterventionSaveState } from "@/components/interventions/InterventionHeaderContext";

const SAVE_LABELS: Record<
  ReturnType<typeof useInterventionSaveState>,
  string
> = {
  idle: "Guardado",
  saving: "Guardando cambios",
  saved: "Cambios guardados",
};

export function InterventionSaveIndicator() {
  const saveState = useInterventionSaveState();
  const label = SAVE_LABELS[saveState];

  return (
    <span
      className="inline-flex h-9 w-9 items-center justify-center"
      aria-live="polite"
      aria-label={label}
      title={label}
    >
      {saveState === "saving" ? (
        <Loader2
          className="h-4 w-4 animate-spin text-muted"
          aria-hidden
        />
      ) : (
        <Save
          className={`h-4 w-4 ${
            saveState === "saved" ? "text-success" : "text-muted"
          }`}
          aria-hidden
        />
      )}
    </span>
  );
}
