import type { InterventionStatus } from "@/lib/types";

export function shouldActivateIntervention(status: InterventionStatus): boolean {
  return status === "draft";
}
