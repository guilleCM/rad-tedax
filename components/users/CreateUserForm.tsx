"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { roleLabel } from "@/lib/services/permissions";
import { Button, Input, Label } from "@/components/ui/forms";

type Props = {
  actorRole: UserRole;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const MANAGER_ROLES: UserRole[] = ["manager", "leader", "participant"];

export function CreateUserForm({ actorRole, onSuccess, onCancel }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("participant");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManager = actorRole === "manager";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, string> = { name, email, password };
    if (isManager) body.role = role;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo crear el usuario");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setRole("participant");
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {!isManager && (
        <p className="text-sm text-muted">
          El usuario se creará como interviniente para las operaciones (sin acceso al sistema).
        </p>
      )}

      <div>
        <Label htmlFor="user-name">Nombre</Label>
        <Input
          id="user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="user-password">Contraseña</Label>
        <Input
          id="user-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {isManager && (
        <div>
          <Label htmlFor="user-role">Rol</Label>
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
          >
            {MANAGER_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving}>
          {saving ? "Creando…" : "Crear usuario"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </form>
  );
}
