"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  formatDatetimeLocal,
  parseDatetimeLocal,
} from "@/lib/datetime-local";
import { Button, Input, Label } from "@/components/ui/forms";

type Props = {
  defaultName: string;
};

type CreatedIntervention = {
  id: string;
};

type FormPhase = "idle" | "creating" | "opening";

export function NewInterventionForm({ defaultName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [zone, setZone] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    formatDatetimeLocal(new Date()),
  );
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<FormPhase>("idle");
  const [isNavigating, startTransition] = useTransition();

  const busy = phase !== "idle" || isNavigating;
  const statusLabel = phase === "creating" ? "Creando…" : "Abriendo mapa…";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("creating");
    setError(null);

    const occurredDate = parseDatetimeLocal(occurredAt);
    if (!occurredDate) {
      setError("La fecha no es válida.");
      setPhase("idle");
      return;
    }

    const body: Record<string, string> = {
      name,
      occurredAt: occurredDate.toISOString(),
    };
    const trimmedZone = zone.trim();
    if (trimmedZone) body.locationLabel = trimmedZone;

    const result = await apiFetch<CreatedIntervention>("/api/interventions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!result.ok) {
      setError(result.error.message);
      setPhase("idle");
      if (result.error.code === "UNAUTHORIZED") {
        router.push("/login?callbackUrl=/interventions/new");
      }
      return;
    }

    setPhase("opening");
    startTransition(() => {
      router.push(`/interventions/${result.data.id}/map`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="relative mx-auto max-w-md space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          required
          disabled={busy}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. OP_RAD_1"
        />
      </div>
      <div>
        <Label htmlFor="zone">Zona de la operación</Label>
        <Input
          id="zone"
          disabled={busy}
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="Calle X, Palma"
        />
        <p className="mt-1 text-xs text-muted">
          Opcional. Al crear se intentará ubicar el mapa en esta dirección.
        </p>
      </div>
      <div>
        <Label htmlFor="occurredAt">Fecha</Label>
        <Input
          id="occurredAt"
          type="datetime-local"
          required
          disabled={busy}
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </div>
      {error && (
        <p className="flex items-start gap-2 rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {statusLabel}
          </>
        ) : (
          "Crear y abrir mapa"
        )}
      </Button>
    </form>
  );
}
