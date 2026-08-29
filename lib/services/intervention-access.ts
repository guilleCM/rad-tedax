import type { InterventionDoc } from "@/lib/types";

export function canAccessIntervention(
  intervention: InterventionDoc,
  userId: string,
): boolean {
  if (intervention.ownerId.toString() === userId) return true;
  return intervention.participantIds.some((id) => id.toString() === userId);
}

export function isOwner(intervention: InterventionDoc, userId: string): boolean {
  return intervention.ownerId.toString() === userId;
}
