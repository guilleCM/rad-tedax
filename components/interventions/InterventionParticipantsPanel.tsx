"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  Plus,
  Shield,
  UserRound,
} from "lucide-react";
import { AddOperationParticipantDialog } from "@/components/interventions/AddOperationParticipantDialog";
import { apiFetch } from "@/lib/api-client";
import { usePatchInterventionHeader } from "@/components/interventions/InterventionHeaderContext";
import { OperationHistoryDialog } from "@/components/interventions/OperationHistoryDialog";
import { OperationParticipantCard } from "@/components/interventions/OperationParticipantCard";
import { FinalizeOperationButton } from "@/components/interventions/FinalizeOperationButton";
import { RemoveOperationParticipantDialog } from "@/components/interventions/RemoveOperationParticipantDialog";
import type { SerializedOperationParticipant } from "@/components/interventions/operation-participant-types";
import {
  SummaryStatCard,
  TeamDoseProgressCard,
} from "@/components/interventions/participant-ui";
import { useLiveClock } from "@/components/interventions/useLiveClock";
import { getSerializedParticipantTotals } from "@/domain/dosimetry/computeDose";
import {
  dosePercentOfLimit,
  formatAccumulatedDose,
  formatDoseValue,
} from "@/lib/dosimetry/formatOperationDose";
import type {
  ActiveZone,
  InterventionStatus,
  OperationDosimetry,
} from "@/lib/types";
import { Button, Input, Label } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";

export type SerializedParticipant = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  interventionId: string;
  interventionStatus: InterventionStatus;
  operationDosimetry: OperationDosimetry;
  operationParticipants: SerializedOperationParticipant[];
  readOnly?: boolean;
};

export function InterventionParticipantsPanel({
  interventionId,
  interventionStatus,
  operationDosimetry: initialDosimetry,
  operationParticipants: initialParticipants,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const patchHeader = usePatchInterventionHeader();
  const [status, setStatus] = useState(interventionStatus);
  const [prevInterventionStatus, setPrevInterventionStatus] =
    useState(interventionStatus);
  const [dosimetry, setDosimetry] = useState(initialDosimetry);
  const [prevInitialDosimetry, setPrevInitialDosimetry] =
    useState(initialDosimetry);
  const [participants, setParticipants] = useState(initialParticipants);
  const [prevInitialParticipants, setPrevInitialParticipants] =
    useState(initialParticipants);
  const [zoneByUser, setZoneByUser] = useState<Record<string, ActiveZone>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [editingDose, setEditingDose] = useState(false);
  const [draftDoseValue, setDraftDoseValue] = useState(10);
  const [draftDoseUnit, setDraftDoseUnit] =
    useState<OperationDosimetry["maxOperationDose"]["unit"]>("mSv");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasActiveSessions = participants.some((participant) => participant.isActive);
  const now = useLiveClock(hasActiveSessions);

  if (initialDosimetry !== prevInitialDosimetry) {
    setPrevInitialDosimetry(initialDosimetry);
    setDosimetry(initialDosimetry);
  }

  if (interventionStatus !== prevInterventionStatus) {
    setPrevInterventionStatus(interventionStatus);
    setStatus(interventionStatus);
  }

  if (initialParticipants !== prevInitialParticipants) {
    setPrevInitialParticipants(initialParticipants);
    setParticipants((current) => {
      const hasLocalActive = current.some((participant) => participant.isActive);
      if (hasLocalActive) return current;
      return initialParticipants;
    });
  }

  const activeCount = participants.filter((participant) => participant.isActive).length;
  const totalCount = participants.length;

  const teamTotals = useMemo(() => {
    let accumulatedMsv = 0;
    for (const participant of participants) {
      const totals = getSerializedParticipantTotals(
        participant.sessions,
        participant.zoneParams,
        now,
      );
      accumulatedMsv += totals.accumulatedDoseMsv;
    }
    return accumulatedMsv;
  }, [participants, now]);

  const percent = dosePercentOfLimit(
    teamTotals,
    dosimetry.maxOperationDose.value,
    dosimetry.maxOperationDose.unit,
  );

  const effectiveReadOnly = readOnly || status === "closed";

  function getSelectedZone(participant: SerializedOperationParticipant): ActiveZone {
    if (zoneByUser[participant.userId]) {
      return zoneByUser[participant.userId];
    }
    if (participant.isActive && participant.activeZone) {
      return participant.activeZone;
    }
    return "II";
  }

  function openDoseDialog() {
    if (effectiveReadOnly) return;
    setDraftDoseValue(dosimetry.maxOperationDose.value);
    setDraftDoseUnit(dosimetry.maxOperationDose.unit);
    setDialogError(null);
    setEditingDose(true);
  }

  async function saveDosimetry(next: OperationDosimetry) {
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await apiFetch<{ operationDosimetry: OperationDosimetry }>(
      `/api/interventions/${interventionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationDosimetry: next }),
      },
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setDosimetry(result.data.operationDosimetry);
    setEditingDose(false);
    setMessage("Configuración guardada");
    router.refresh();
  }

  function applyDoseSettings() {
    if (draftDoseValue <= 0) {
      setDialogError("La dosis debe ser mayor que 0");
      return;
    }

    void saveDosimetry({
      maxOperationDose: {
        value: draftDoseValue,
        unit: draftDoseUnit,
      },
    });
  }

  function handleSessionChange(
    userId: string,
    updated: SerializedOperationParticipant,
  ) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.userId === userId ? updated : participant,
      ),
    );
    if (updated.activeZone) {
      setZoneByUser((current) => ({
        ...current,
        [userId]: updated.activeZone!,
      }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <SummaryStatCard
          title="Intervinientes"
          value={String(activeCount)}
          valueSuffix="activos"
          detail={`de ${totalCount} totales`}
          icon={UserRound}
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
          disabled={effectiveReadOnly}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <TeamDoseProgressCard
          accumulatedMsv={teamTotals}
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
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Lista de intervinientes
          </h2>
          {!effectiveReadOnly && (
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-2 text-xs"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Añadir
            </Button>
          )}
        </div>

        {participants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">
              No hay intervinientes en esta operación.
            </p>
            {!effectiveReadOnly && (
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Añadir interviniente
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {participants.map((participant) => (
              <OperationParticipantCard
                key={participant.userId}
                participant={participant}
                interventionId={interventionId}
                maxOperationDose={dosimetry.maxOperationDose}
                readOnly={effectiveReadOnly}
                selectedZone={getSelectedZone(participant)}
                onZoneChange={(zone) =>
                  setZoneByUser((current) => ({
                    ...current,
                    [participant.userId]: zone,
                  }))
                }
                onSessionChange={(updated) =>
                  handleSessionChange(participant.userId, updated)
                }
                onInterventionActivated={() => {
                  setStatus("active");
                  patchHeader({ status: "active" });
                  router.refresh();
                }}
                onError={setError}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setHistoryOpen(true)}
        >
          <Clock className="h-4 w-4" aria-hidden />
          Ver historial
        </Button>
        {!effectiveReadOnly && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={participants.length === 0}
            onClick={() => setRemoveOpen(true)}
          >
            <UserRound className="h-4 w-4" aria-hidden />
            Relevo / Salida
          </Button>
        )}
      </div>

      <FinalizeOperationButton
        interventionId={interventionId}
        status={status}
        readOnly={effectiveReadOnly}
        hasActiveSessions={hasActiveSessions}
        onClosed={() => setStatus("closed")}
      />

      <AddOperationParticipantDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        interventionId={interventionId}
        onAdded={(participant) => {
          setParticipants((current) => [...current, participant]);
          setMessage("Interviniente añadido");
          router.refresh();
        }}
      />

      <OperationHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        participants={participants}
        now={now}
      />

      <RemoveOperationParticipantDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        interventionId={interventionId}
        participants={participants}
        onRemoved={(userId) => {
          setParticipants((current) =>
            current.filter((participant) => participant.userId !== userId),
          );
          setMessage("Interviniente retirado");
          router.refresh();
        }}
      />

      <Dialog
        open={editingDose}
        onClose={() => setEditingDose(false)}
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
                setDraftDoseUnit(
                  e.target.value as OperationDosimetry["maxOperationDose"]["unit"],
                )
              }
            >
              <option value="mSv">mSv</option>
              <option value="uSv">µSv</option>
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
              onClick={() => setEditingDose(false)}
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
