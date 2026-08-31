import type { InterventionStatus } from "@/lib/types";
import {
  interventionStatusBadgeClasses,
  interventionStatusLabel,
} from "@/lib/interventions/status";

type Props = {
  status: InterventionStatus;
  className?: string;
};

export function InterventionStatusBadge({ status, className = "" }: Props) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${interventionStatusBadgeClasses(status)} ${className}`.trim()}
    >
      {interventionStatusLabel(status)}
    </span>
  );
}
