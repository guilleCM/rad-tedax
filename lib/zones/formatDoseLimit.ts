import type { DoseLimitBound, DoseUnit, ZoneIILimit } from "@/lib/types";

export const DOSE_UNITS: { value: DoseUnit; label: string }[] = [
  { value: "uSv/h", label: "µSv/h" },
  { value: "mSv/h", label: "mSv/h" },
];

const UNIT_LABEL: Record<DoseUnit, string> = {
  "uSv/h": "µSv/h",
  "mSv/h": "mSv/h",
};

export function formatDoseBound(bound: DoseLimitBound): string {
  return `${bound.value} ${UNIT_LABEL[bound.unit]}`;
}

export function formatZoneILimit(bound: DoseLimitBound): string {
  return formatDoseBound(bound);
}

export function formatZoneIILimit(limit: ZoneIILimit): string {
  return `${formatDoseBound(limit.lower)} y ${formatDoseBound(limit.upper)}`;
}
