"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button, Input, Label } from "@/components/ui/forms";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateIntervinienteDialog({ open, onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleClose() {
    if (saving) return;
    setError(null);
    setMessage(null);
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/users/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo crear el interviniente");
      return;
    }

    setMessage(`Interviniente ${json.data.name} registrado`);
    setName("");
    onSuccess?.();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Crear interviniente">
      <form onSubmit={onSubmit} className="space-y-3">
        <p className="text-sm text-muted">
          Registra un interviniente para las operaciones.
        </p>

        <div>
          <Label htmlFor="interviniente-name">Nombre</Label>
          <Input
            id="interviniente-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? "Creando…" : "Crear"}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {message && (
          <p className="flex items-start gap-2 rounded-md bg-success px-3 py-2 text-sm text-success-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {message}
          </p>
        )}
      </form>
    </Dialog>
  );
}
