"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  doseRateMsvPerHour,
  getSerializedParticipantTotals,
} from "@/domain/dosimetry/computeDose";
import {
  formatDurationHms,
  OPERATION_TEAM_LABELS,
  type SerializedOperationParticipant,
} from "@/components/interventions/operation-participant-types";
import { ParticipantAvatar, ParticipantDoseProgressRow, ZoneRadioToggle } from "@/components/interventions/participant-ui";
import { useLiveClock } from "@/components/interventions/useLiveClock";
import { apiFetch } from "@/lib/api-client";
import {
  dosePercentOfLimit,
  formatAccumulatedDoseMsv,
} from "@/lib/dosimetry/formatOperationDose";
import { doseRiskLabel } from "@/lib/dosimetry/riskLevel";
import type { ActiveZone, OperationDosimetry } from "@/lib/types";

function formatRate(
  zone: ActiveZone,
  zoneParams: SerializedOperationParticipant["zoneParams"],
) {
  const rate = doseRateMsvPerHour(zone, zoneParams);
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rate >= 1 ? rate : rate * 1000);
  return rate >= 1 ? `${formatted} mSv/h` : `${formatted} µSv/h`;
}

type SessionResponse = SerializedOperationParticipant & {
  interventionStatus?: "active";
};

type Props = {
  participant: SerializedOperationParticipant;
  interventionId: string;
  maxOperationDose: OperationDosimetry["maxOperationDose"];
  readOnly: boolean;
  selectedZone: ActiveZone;
  onZoneChange: (zone: ActiveZone) => void;
  onSessionChange: (participant: SerializedOperationParticipant) => void;
  onInterventionActivated?: () => void;
  onError: (message: string) => void;
};

export function OperationParticipantCard({
  participant,
  interventionId,
  maxOperationDose,
  readOnly,
  selectedZone,
  onZoneChange,
  onSessionChange,
  onInterventionActivated,
  onError,
}: Props) {
  const [acting, setActing] = useState(false);
  const now = useLiveClock(participant.isActive);
  const totals = getSerializedParticipantTotals(
    participant.sessions,
    participant.zoneParams,
    now,
  );

  const percent = dosePercentOfLimit(
    totals.accumulatedDoseMsv,
    maxOperationDose.value,
    maxOperationDose.unit,
  );
  const risk = doseRiskLabel(percent);
  const displayZone = selectedZone;
  const hasMetrics =
    participant.isActive || totals.timeInZoneSeconds > 0;

  async function handlePlayStop() {
    if (readOnly || acting) return;
    setActing(true);

    const url = `/api/interventions/${interventionId}/operation-participants/${participant.userId}/session`;
    const result = participant.isActive
      ? await apiFetch<SessionResponse>(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        })
      : await apiFetch<SessionResponse>(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", zone: selectedZone }),
        });

    setActing(false);

    if (!result.ok) {
      onError(result.error.message);
      return;
    }

    const data = result.data;
    if (!participant.isActive) {
      onInterventionActivated?.();
    }
    onSessionChange(data);
  }

  async function handleZoneSelect(zone: ActiveZone) {
    const currentZone = participant.isActive
      ? (participant.activeZone ?? selectedZone)
      : selectedZone;
    onZoneChange(zone);
    if (!participant.isActive || readOnly || acting || zone === currentZone) {
      return;
    }

    setActing(true);
    const result = await apiFetch<SerializedOperationParticipant>(
      `/api/interventions/${interventionId}/operation-participants/${participant.userId}/session`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeZone", zone }),
      },
    );
    setActing(false);

    if (!result.ok) {
      onError(result.error.message);
      return;
    }

    onSessionChange(result.data);
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-3">
          <ParticipantAvatar name={participant.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {participant.name}
            </p>
            <p className="text-xs text-muted">
              {OPERATION_TEAM_LABELS[participant.team]}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${risk.className}`}
          >
            {risk.text}
          </span>
          <span className="text-xs text-muted">
            Dosis acum. {formatAccumulatedDoseMsv(totals.accumulatedDoseMsv)}
          </span>
        </div>

        <div className="mt-3">
          <ParticipantDoseProgressRow
            rateLabel={
              hasMetrics
                ? formatRate(displayZone, participant.zoneParams)
                : "—"
            }
            timeLabel={formatDurationHms(totals.timeInZoneSeconds)}
            percent={percent}
          />
        </div>
      </div>

      {!readOnly && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handlePlayStop()}
            disabled={acting}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md border border-border transition-colors ${
              participant.isActive
                ? "bg-danger text-danger-foreground hover:opacity-90"
                : "bg-success text-success-foreground hover:opacity-90"
            } disabled:opacity-50`}
            aria-label={participant.isActive ? "Detener" : "Iniciar"}
            title={participant.isActive ? "Detener" : "Iniciar"}
          >
            {participant.isActive ? (
              <Pause className="h-5 w-5" aria-hidden />
            ) : (
              <Play className="h-5 w-5" aria-hidden />
            )}
          </button>
          <ZoneRadioToggle
            name={`zone-${participant.userId}`}
            value={displayZone}
            onChange={(zone) => void handleZoneSelect(zone)}
            disabled={acting}
          />
        </div>
      )}
    </li>
  );
}
