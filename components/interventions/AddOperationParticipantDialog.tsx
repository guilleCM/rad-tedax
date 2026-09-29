"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { Button, Input, Label } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";
import { apiFetch } from "@/lib/api-client";
import type { SerializedOperationParticipant } from "@/components/interventions/operation-participant-types";
import {
  OPERATION_TEAM_LABELS,
  OPERATION_TEAMS,
  type OperationTeam,
} from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  interventionId: string;
  onAdded: (participant: SerializedOperationParticipant) => void;
};

export function AddOperationParticipantDialog({
  open,
  onClose,
  interventionId,
  onAdded,
}: Props) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<OperationTeam>("search");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (saving) return;
    setName("");
    setTeam("search");
    setError(null);
    onClose();
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe el nombre");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await apiFetch<SerializedOperationParticipant>(
      `/api/interventions/${interventionId}/operation-participants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, team }),
      },
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    onAdded(result.data);
    setName("");
    setTeam("search");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Añadir interviniente">
      <form onSubmit={handleAdd} className="space-y-4">
        <p className="text-sm text-muted">
          Escribe el nombre de la persona que entra en la operación.
        </p>

        <div>
          <Label htmlFor="participant-name">Nombre</Label>
          <Input
            id="participant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre y apellidos"
            maxLength={120}
            autoFocus
            required
          />
        </div>

        <div>
          <Label htmlFor="participant-team">Equipo</Label>
          <select
            id="participant-team"
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
            value={team}
            onChange={(event) => setTeam(event.target.value as OperationTeam)}
          >
            {OPERATION_TEAMS.map((value) => (
              <option key={value} value={value}>
                {OPERATION_TEAM_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-danger-foreground">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <UserRound className="h-4 w-4" aria-hidden />
            {saving ? "Añadiendo…" : "Añadir"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
