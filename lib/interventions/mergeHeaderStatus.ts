import type { InterventionStatus } from "@/lib/types";

export type InterventionHeaderLike = {
  name: string;
  status: InterventionStatus;
  createdAt: string;
  readOnly?: boolean;
};

const STATUS_RANK: Record<InterventionStatus, number> = {
  draft: 0,
  active: 1,
  closed: 2,
};

function isSameIntervention(
  current: InterventionHeaderLike,
  next: InterventionHeaderLike,
): boolean {
  return (
    current.createdAt === next.createdAt && current.name === next.name
  );
}

export function mergeInterventionHeader(
  current: InterventionHeaderLike | null,
  next: InterventionHeaderLike,
): InterventionHeaderLike {
  if (!current || !isSameIntervention(current, next)) {
    return next;
  }

  return {
    ...next,
    status:
      STATUS_RANK[current.status] > STATUS_RANK[next.status]
        ? current.status
        : next.status,
  };
}
