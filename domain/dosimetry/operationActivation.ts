import type { InterventionStatus, OperationParticipant } from "@/lib/types";

export function isFirstOperationPlay(
  participants: OperationParticipant[],
): boolean {
  return !participants.some((participant) => participant.sessions.length > 0);
}

export function shouldActivateIntervention(
  status: InterventionStatus,
  participants: OperationParticipant[],
): boolean {
  return status === "draft" && isFirstOperationPlay(participants);
}
