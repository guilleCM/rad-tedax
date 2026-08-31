import type { InterventionStatus } from "@/lib/types";

const STATUS_LABELS: Record<InterventionStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  closed: "Cerrada",
};

const STATUS_BADGE_CLASSES: Record<InterventionStatus, string> = {
  draft: "bg-warning text-warning-foreground",
  active: "bg-success text-success-foreground",
  closed: "bg-info text-info-foreground",
};

export function interventionStatusLabel(status: InterventionStatus): string {
  return STATUS_LABELS[status];
}

export function interventionStatusBadgeClasses(
  status: InterventionStatus,
): string {
  return STATUS_BADGE_CLASSES[status];
}
