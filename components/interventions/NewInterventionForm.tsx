"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button, Input, Label } from "@/components/ui/forms";

type Props = {
  defaultName: string;
};

type CreatedIntervention = {
  id: string;
};

export function NewInterventionForm({ defaultName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [zone, setZone] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const occurredDate = new Date(occurredAt);
    if (Number.isNaN(occurredDate.getTime())) {
      setError("La fecha no es válida.");
      setLoading(false);
      return;
    }

    const body: Record<string, string> = {
      name,
      occurredAt: occurredDate.toISOString(),
    };
    const trimmedZone = zone.trim();
    if (trimmedZone) body.locationLabel = trimmedZone;

    try {
      const result = await apiFetch<CreatedIntervention>("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!result.ok) {
        setError(result.error.message);
        if (result.error.code === "UNAUTHORIZED") {
          router.push("/login?callbackUrl=/interventions/new");
        }
        return;
      }

      router.push(`/interventions/${result.data.id}/map`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. OP_RAD_1"
        />
      </div>
      <div>
        <Label htmlFor="zone">Zona de la operación</Label>
        <Input
          id="zone"
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
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creando…" : "Crear y abrir mapa"}
      </Button>
    </form>
  );
}
