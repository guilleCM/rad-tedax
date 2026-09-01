"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  Shield,
  UserRound,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";
import {
  ParticipantAvatar,
  SummaryStatCard,
  TeamDoseProgressCard,
} from "@/components/interventions/participant-ui";
import {
  ACCUMULATED_DOSE_UNITS,
  dosePercentOfLimit,
  formatAccumulatedDose,
  formatDoseValue,
} from "@/lib/dosimetry/formatOperationDose";
import type {
  AccumulatedDoseUnit,
  OperationDosimetry,
} from "@/lib/types";

export type SerializedParticipant = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  interventionId: string;
  operationDosimetry: OperationDosimetry;
  participants: SerializedParticipant[];
  readOnly?: boolean;
};

type EditingDialog = "team" | "dose" | null;

export function InterventionParticipantsPanel({
  interventionId,
  operationDosimetry: initialDosimetry,
  participants,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [dosimetry, setDosimetry] = useState(initialDosimetry);
  const [prevInitialDosimetry, setPrevInitialDosimetry] =
    useState(initialDosimetry);
  const [editing, setEditing] = useState<EditingDialog>(null);
  const [draftActive, setDraftActive] = useState(0);
  const [draftTotal, setDraftTotal] = useState(0);
  const [draftDoseValue, setDraftDoseValue] = useState(10);
  const [draftDoseUnit, setDraftDoseUnit] =
    useState<AccumulatedDoseUnit>("mSv");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (initialDosimetry !== prevInitialDosimetry) {
    setPrevInitialDosimetry(initialDosimetry);
    setDosimetry(initialDosimetry);
  }

  const accumulatedMsv = 0;
  const percent = dosePercentOfLimit(
    accumulatedMsv,
    dosimetry.maxOperationDose.value,
    dosimetry.maxOperationDose.unit,
  );

  function openTeamDialog() {
    if (readOnly) return;
    setDraftActive(dosimetry.activeParticipants);
    setDraftTotal(dosimetry.totalParticipants);
    setDialogError(null);
    setEditing("team");
  }

  function openDoseDialog() {
    if (readOnly) return;
    setDraftDoseValue(dosimetry.maxOperationDose.value);
    setDraftDoseUnit(dosimetry.maxOperationDose.unit);
    setDialogError(null);
    setEditing("dose");
  }

  async function saveDosimetry(next: OperationDosimetry) {
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/interventions/${interventionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationDosimetry: next }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo guardar la configuración");
      return;
    }

    setDosimetry(json.data.operationDosimetry);
    setEditing(null);
    setMessage("Configuración guardada");
    router.refresh();
  }

  function applyTeamSettings() {
    if (draftActive < 0 || draftActive > 12 || draftTotal < 0 || draftTotal > 12) {
      setDialogError("Los valores deben estar entre 0 y 12");
      return;
    }
    if (draftActive > draftTotal) {
      setDialogError("Los activos no pueden superar el total");
      return;
    }

    void saveDosimetry({
      ...dosimetry,
      activeParticipants: draftActive,
      totalParticipants: draftTotal,
    });
  }

  function applyDoseSettings() {
    if (draftDoseValue <= 0) {
      setDialogError("La dosis debe ser mayor que 0");
      return;
    }

    void saveDosimetry({
      ...dosimetry,
      maxOperationDose: {
        value: draftDoseValue,
        unit: draftDoseUnit,
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <SummaryStatCard
          title="Intervinientes"
          value={String(dosimetry.activeParticipants)}
          valueSuffix="activos"
          detail={`de ${dosimetry.totalParticipants} totales`}
          icon={UserRound}
          onClick={openTeamDialog}
          disabled={readOnly}
        />
        <SummaryStatCard
          title="Dosis máxima permitida"
          subtitle="(Operación)"
          value={formatDoseValue(dosimetry.maxOperationDose.value)}
          valueSuffix={
            dosimetry.maxOperationDose.unit === "uSv" ? "µSv" : "mSv"
          }
          icon={Shield}
          onClick={openDoseDialog}
          disabled={readOnly}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <TeamDoseProgressCard
          accumulatedMsv={accumulatedMsv}
          maxValue={dosimetry.maxOperationDose.value}
          maxUnit={dosimetry.maxOperationDose.unit}
          percent={percent}
        />
      </section>

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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Lista de intervinientes
          </h2>
          <span className="text-xs text-muted">Ordenar</span>
        </div>

        {participants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">No hay intervinientes asignados.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <ParticipantAvatar name={participant.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {participant.name}
                        </p>
                        <p className="text-xs text-muted">Interviniente</p>
                      </div>
                      <button
                        type="button"
                        disabled
                        title="Próximamente"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted opacity-50"
                        aria-label="Opciones"
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
                        BAJO
                      </span>
                      <span className="text-xs text-muted">
                        Dosis acum. — / —
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                      <div>
                        <dt className="inline">Entrada: </dt>
                        <dd className="inline">—</dd>
                      </div>
                      <div>
                        <dt className="inline">Tiempo en zona: </dt>
                        <dd className="inline">—</dd>
                      </div>
                      <div>
                        <dt className="inline">Tasa área: </dt>
                        <dd className="inline">—</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          disabled
          title="Próximamente"
          className="w-full"
        >
          <Clock className="h-4 w-4" aria-hidden />
          Ver historial
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled
          title="Próximamente"
          className="w-full"
        >
          <UserRound className="h-4 w-4" aria-hidden />
          Relevo / Salida
        </Button>
      </div>

      <Dialog
        open={editing === "team"}
        onClose={() => setEditing(null)}
        title="Configurar intervinientes"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="active-participants">Activos (0–12)</Label>
            <Input
              id="active-participants"
              type="number"
              min={0}
              max={12}
              value={draftActive}
              onChange={(e) => setDraftActive(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="total-participants">Totales (0–12)</Label>
            <Input
              id="total-participants"
              type="number"
              min={0}
              max={12}
              value={draftTotal}
              onChange={(e) => setDraftTotal(Number(e.target.value))}
            />
          </div>

          {dialogError && (
            <p className="text-sm text-danger-foreground">{dialogError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={applyTeamSettings}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={editing === "dose"}
        onClose={() => setEditing(null)}
        title="Dosis máxima permitida"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="max-dose-value">Valor</Label>
            <Input
              id="max-dose-value"
              type="number"
              min={0}
              step="any"
              value={draftDoseValue}
              onChange={(e) => setDraftDoseValue(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="max-dose-unit">Unidad</Label>
            <select
              id="max-dose-unit"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
              value={draftDoseUnit}
              onChange={(e) =>
                setDraftDoseUnit(e.target.value as AccumulatedDoseUnit)
              }
            >
              {ACCUMULATED_DOSE_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">
            Límite operativo actual:{" "}
            {formatAccumulatedDose(
              dosimetry.maxOperationDose.value,
              dosimetry.maxOperationDose.unit,
            )}
          </p>

          {dialogError && (
            <p className="text-sm text-danger-foreground">{dialogError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={applyDoseSettings}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
