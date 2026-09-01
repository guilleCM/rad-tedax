"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Button, Input, Label } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";
import { ParticipantAvatar } from "@/components/interventions/participant-ui";
import type { SerializedOperationParticipant } from "@/components/interventions/operation-participant-types";
import { OPERATION_TEAM_LABELS } from "@/components/interventions/operation-participant-types";
import type { OperationTeam } from "@/lib/types";

type RegistryUser = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  interventionId: string;
  excludedUserIds: string[];
  onAdded: (participant: SerializedOperationParticipant) => void;
};

export function AddOperationParticipantDialog({
  open,
  onClose,
  interventionId,
  excludedUserIds,
  onAdded,
}: Props) {
  const [users, setUsers] = useState<RegistryUser[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [team, setTeam] = useState<OperationTeam>("search");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;

    let cancelled = false;

    (async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setError(json.error?.message ?? "No se pudieron cargar intervinientes");
        return;
      }

      setUsers(
        (json.data as RegistryUser[]).filter((user) => user.role === "participant"),
      );
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  const loadingUsers = open && !loaded;
  const filtered = useMemo(() => {
    const excluded = new Set(excludedUserIds);
    const q = query.trim().toLowerCase();
    return users
      .filter((user) => !excluded.has(user.id))
      .filter((user) => !q || user.name.toLowerCase().includes(q));
  }, [users, excludedUserIds, query]);

  function handleClose() {
    setQuery("");
    setSelectedUserId(null);
    setTeam("search");
    setError(null);
    onClose();
  }

  async function handleAdd() {
    if (!selectedUserId) {
      setError("Selecciona un interviniente");
      return;
    }

    setSaving(true);
    setError(null);
    const res = await fetch(
      `/api/interventions/${interventionId}/operation-participants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, team }),
      },
    );
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo añadir el interviniente");
      return;
    }

    onAdded(json.data);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Añadir interviniente">
      <div className="space-y-4">
        <div>
          <Label htmlFor="participant-search">Buscar por nombre</Label>
          <div className="relative mt-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              id="participant-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre del interviniente"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
          {loadingUsers && (
            <p className="px-2 py-4 text-center text-sm text-muted">
              Cargando intervinientes…
            </p>
          )}
          {!loadingUsers && filtered.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted">
              No hay intervinientes disponibles.
            </p>
          )}
          {filtered.map((user) => {
            const selected = selectedUserId === user.id;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                  selected ? "bg-accent/15 ring-1 ring-accent" : "hover:bg-surface"
                }`}
              >
                <ParticipantAvatar name={user.name} size="sm" />
                <span className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <Label htmlFor="participant-team">Equipo</Label>
          <select
            id="participant-team"
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
            value={team}
            onChange={(e) => setTeam(e.target.value as OperationTeam)}
          >
            {(Object.keys(OPERATION_TEAM_LABELS) as OperationTeam[]).map(
              (value) => (
                <option key={value} value={value}>
                  {OPERATION_TEAM_LABELS[value]}
                </option>
              ),
            )}
          </select>
        </div>

        {error && <p className="text-sm text-danger-foreground">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleAdd} disabled={saving}>
            <UserRound className="h-4 w-4" aria-hidden />
            {saving ? "Añadiendo…" : "Añadir"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
