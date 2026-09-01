"use client";

import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import {
  OPERATION_TEAM_LABELS,
  type SerializedOperationParticipant,
} from "@/components/interventions/operation-participant-types";
import { ParticipantAvatar } from "@/components/interventions/participant-ui";
import { Button, Input, Label } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  interventionId: string;
  participants: SerializedOperationParticipant[];
  onRemoved: (userId: string) => void;
};

export function RemoveOperationParticipantDialog({
  open,
  onClose,
  interventionId,
  participants,
  onRemoved,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants.filter(
      (participant) => !q || participant.name.toLowerCase().includes(q),
    );
  }, [participants, query]);

  const selected = participants.find(
    (participant) => participant.userId === selectedUserId,
  );

  function handleClose() {
    setQuery("");
    setSelectedUserId(null);
    setError(null);
    onClose();
  }

  async function handleRemove() {
    if (!selectedUserId || !selected) {
      setError("Selecciona un interviniente");
      return;
    }

    setRemoving(true);
    setError(null);

    if (selected.isActive) {
      const stopRes = await fetch(
        `/api/interventions/${interventionId}/operation-participants/${selectedUserId}/session`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        },
      );
      const stopJson = await stopRes.json();
      if (!stopRes.ok) {
        setRemoving(false);
        setError(stopJson.error?.message ?? "No se pudo detener la sesión");
        return;
      }
    }

    const deleteRes = await fetch(
      `/api/interventions/${interventionId}/operation-participants?userId=${selectedUserId}`,
      { method: "DELETE" },
    );
    const deleteJson = await deleteRes.json();
    setRemoving(false);

    if (!deleteRes.ok) {
      setError(deleteJson.error?.message ?? "No se pudo retirar el interviniente");
      return;
    }

    onRemoved(selectedUserId);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Relevo / Salida">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Selecciona el interviniente que quieres retirar de la operación.
        </p>

        <div>
          <Label htmlFor="remove-participant-search">Buscar por nombre</Label>
          <div className="relative mt-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              id="remove-participant-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre del interviniente"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted">
              No hay intervinientes que coincidan.
            </p>
          )}
          {filtered.map((participant) => {
            const isSelected = selectedUserId === participant.userId;
            return (
              <button
                key={participant.userId}
                type="button"
                onClick={() => setSelectedUserId(participant.userId)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-accent/15 ring-1 ring-accent"
                    : "hover:bg-surface"
                }`}
              >
                <ParticipantAvatar name={participant.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {participant.name}
                  </p>
                  <p className="text-xs text-muted">
                    {OPERATION_TEAM_LABELS[participant.team]}
                  </p>
                </div>
                {participant.isActive && (
                  <span className="shrink-0 rounded-full bg-success px-2 py-0.5 text-[10px] font-medium text-success-foreground">
                    En zona
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selected?.isActive && (
          <p className="text-xs text-muted">
            Se detendrá su sesión y se retirará de la operación.
          </p>
        )}

        {error && <p className="text-sm text-danger-foreground">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void handleRemove()}
            disabled={removing}
          >
            <UserRound className="h-4 w-4" aria-hidden />
            {removing ? "Retirando…" : "Quitar de la operación"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
