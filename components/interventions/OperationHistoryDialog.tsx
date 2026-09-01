"use client";

import { useMemo } from "react";
import {
  buildOperationHistoryEvents,
  type OperationHistoryEvent,
} from "@/domain/dosimetry/buildOperationHistory";
import {
  formatDuration,
  formatTimeLabel,
  ZONE_UI,
  type SerializedOperationParticipant,
} from "@/components/interventions/operation-participant-types";
import { ParticipantAvatar } from "@/components/interventions/participant-ui";
import { formatAccumulatedDoseMsv } from "@/lib/dosimetry/formatOperationDose";
import { Dialog } from "@/components/ui/Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  participants: SerializedOperationParticipant[];
  now: Date;
};

function describeEvent(event: OperationHistoryEvent): string {
  switch (event.type) {
    case "participant_added":
      return "Añadido a la operación";
    case "session_start":
      return `Entrada en ${ZONE_UI[event.zone!].label}`;
    case "zone_change":
      return `Cambio a ${ZONE_UI[event.zone!].label}`;
    case "session_end":
      return `Salida de zona · ${formatDuration(event.durationSeconds ?? 0)} · ${formatAccumulatedDoseMsv(event.doseMsv ?? 0)}`;
    case "session_active":
      return `En zona · ${ZONE_UI[event.zone!].label}`;
  }
}

export function OperationHistoryDialog({
  open,
  onClose,
  participants,
  now,
}: Props) {
  const events = useMemo(
    () => buildOperationHistoryEvents(participants, now),
    [participants, now],
  );

  return (
    <Dialog open={open} onClose={onClose} title="Historial de la operación">
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aún no hay registros en esta operación.
          </p>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.type}-${event.at}-${event.userId}-${index}`}
              className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
            >
              <span className="shrink-0 pt-0.5 font-mono text-xs text-muted">
                {formatTimeLabel(event.at)}
              </span>
              <ParticipantAvatar name={event.participantName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {event.participantName}
                </p>
                <p className="text-xs text-muted">{describeEvent(event)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
