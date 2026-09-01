import type {
  ActiveZone,
  OperationTeam,
  ZoneParams,
} from "@/lib/types";

export type SerializedZoneSegment = {
  zone: ActiveZone;
  startedAt: string;
  endedAt: string | null;
};

export type SerializedParticipantSession = {
  startedAt: string;
  endedAt: string | null;
  segments: SerializedZoneSegment[];
  timeInZoneSeconds: number;
  accumulatedDoseMsv: number;
};

export type SerializedOperationParticipant = {
  userId: string;
  name: string;
  team: OperationTeam;
  addedAt: string;
  sessions: SerializedParticipantSession[];
  isActive: boolean;
  activeZone: ActiveZone | null;
  zoneParams: ZoneParams;
};

export const OPERATION_TEAM_LABELS: Record<OperationTeam, string> = {
  search: "Equipo de búsqueda",
  intervention: "Equipo de intervención",
};

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function formatTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}
