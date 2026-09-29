import {
  OPERATION_TEAM_LABELS,
  type ActiveZone,
  type OperationTeam,
  type ZoneParams,
} from "@/lib/types";

export { OPERATION_TEAM_LABELS };

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

export const ZONE_UI: Record<
  ActiveZone,
  {
    label: string;
    dotFilled: string;
    dotOutline: string;
    text: string;
    selected: string;
    progress: string;
  }
> = {
  I: {
    label: "Zona I",
    dotFilled: "bg-red-500",
    dotOutline: "border border-red-500 bg-transparent",
    text: "text-red-400",
    selected: "border-red-500/60 bg-red-500/10 text-red-300",
    progress: "bg-red-500",
  },
  II: {
    label: "Zona II",
    dotFilled: "bg-orange-500",
    dotOutline: "border border-orange-500 bg-transparent",
    text: "text-orange-400",
    selected: "border-orange-500/60 bg-orange-500/10 text-orange-300",
    progress: "bg-orange-500",
  },
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

export function formatDurationHms(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}
