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
import {
  ParticipantAvatar,
  ParticipantDoseProgressRow,
  ZoneRadioToggle,
} from "@/components/interventions/participant-ui";
import { useLiveClock } from "@/components/interventions/useLiveClock";
import {
  dosePercentOfLimit,
  formatAccumulatedDose,
} from "@/lib/dosimetry/formatOperationDose";
import type {
  AccumulatedDoseUnit,
  ActiveZone,
  OperationDosimetry,
} from "@/lib/types";

function riskLabel(percent: number): {
  text: string;
  className: string;
} {
  if (percent >= 100) {
    return {
      text: "ALTO",
      className: "bg-danger text-danger-foreground",
    };
  }
  if (percent >= 80) {
    return {
      text: "MEDIO",
      className: "bg-warning text-warning-foreground",
    };
  }
  return {
    text: "BAJO",
    className: "bg-success text-success-foreground",
  };
}

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
  const risk = riskLabel(percent);
  const displayZone = selectedZone;
  const hasMetrics =
    participant.isActive || totals.timeInZoneSeconds > 0;

  async function handlePlayStop() {
    if (readOnly || acting) return;
    setActing(true);

    const url = `/api/interventions/${interventionId}/operation-participants/${participant.userId}/session`;
    const res = participant.isActive
      ? await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        })
      : await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", zone: selectedZone }),
        });

    const json = await res.json();
    setActing(false);

    if (!res.ok) {
      onError(json.error?.message ?? "No se pudo actualizar la sesión");
      return;
    }

    const data = json.data as SessionResponse;
    if (data.interventionStatus === "active") {
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
    const res = await fetch(
      `/api/interventions/${interventionId}/operation-participants/${participant.userId}/session`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeZone", zone }),
      },
    );
    const json = await res.json();
    setActing(false);

    if (!res.ok) {
      onError(json.error?.message ?? "No se pudo cambiar de zona");
      return;
    }

    onSessionChange(json.data);
  }

  return (
    <li className="rounded-lg border border-border bg-card p-2">
      <div className="flex items-start justify-between gap-2">
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
        <div className="flex shrink-0 items-center gap-1">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => void handlePlayStop()}
                disabled={acting}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors ${
                  participant.isActive
                    ? "bg-danger text-danger-foreground hover:opacity-90"
                    : "bg-success text-success-foreground hover:opacity-90"
                } disabled:opacity-50`}
                aria-label={participant.isActive ? "Detener" : "Iniciar"}
                title={participant.isActive ? "Detener" : "Iniciar"}
              >
                {participant.isActive ? (
                  <Pause className="h-4 w-4" aria-hidden />
                ) : (
                  <Play className="h-4 w-4" aria-hidden />
                )}
              </button>
              <ZoneRadioToggle
                name={`zone-${participant.userId}`}
                value={displayZone}
                onChange={(zone) => void handleZoneSelect(zone)}
                disabled={acting}
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${risk.className}`}
        >
          {risk.text}
        </span>
        <span className="text-xs text-muted">
          Dosis acum.{" "}
          {formatAccumulatedDose(
            totals.accumulatedDoseMsv,
            "mSv" satisfies AccumulatedDoseUnit,
          )}
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
    </li>
  );
}
