"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { canDeleteUserByRole, roleLabel } from "@/lib/services/permissions";
import { Button } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";
import { CreateUserForm } from "@/components/users/CreateUserForm";

type SerializedUser = {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  createdAt: string;
  createdBy: { id: string; name: string };
};

type Props = {
  actorRole: UserRole;
  actorId: string;
};

export function UsersAdminPanel({ actorRole, actorId }: Props) {
  const [users, setUsers] = useState<SerializedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isLeader = actorRole === "leader";
  const showEmailColumn = actorRole === "manager";
  const createLabel = isLeader ? "Nuevo interviniente" : "Nuevo usuario";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users");
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo cargar la lista");
      return;
    }

    setUsers(json.data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setError(json.error?.message ?? "No se pudo cargar la lista");
        setLoading(false);
        return;
      }

      setUsers(json.data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onDelete(user: SerializedUser) {
    if (
      !window.confirm(
        `¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setDeletingId(user.id);
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error?.message ?? "No se pudo eliminar");
      return;
    }

    await loadUsers();
  }

  function canDeleteRow(user: SerializedUser): boolean {
    return canDeleteUserByRole(
      actorRole,
      user.role,
      user.id,
      actorId,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {isLeader
            ? "Intervinientes registrados en el sistema."
            : "Usuarios e intervinientes del sistema."}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          {createLabel}
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          No hay usuarios todavía.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table
            className={`w-full text-left text-sm ${showEmailColumn ? "min-w-[640px]" : "min-w-[520px]"}`}
          >
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                {showEmailColumn && (
                  <th className="px-4 py-3 font-medium">Email</th>
                )}
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 font-medium">Creado por</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-muted">{roleLabel(user.role)}</td>
                  {showEmailColumn && (
                    <td className="px-4 py-3 text-muted">{user.email ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 text-muted">
                    {new Date(user.createdAt).toLocaleString("es-ES")}
                  </td>
                  <td className="px-4 py-3 text-muted">{user.createdBy.name}</td>
                  <td className="px-4 py-3 text-right">
                    {canDeleteRow(user) && (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={deletingId === user.id}
                        onClick={() => onDelete(user)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {deletingId === user.id ? "…" : "Eliminar"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createLabel}
      >
        <CreateUserForm
          actorRole={actorRole}
          onCancel={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            void loadUsers();
          }}
        />
      </Dialog>
    </div>
  );
}
