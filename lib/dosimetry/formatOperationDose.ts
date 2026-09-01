import type { AccumulatedDoseUnit } from "@/lib/types";

export const ACCUMULATED_DOSE_UNITS: {
  value: AccumulatedDoseUnit;
  label: string;
}[] = [
  { value: "mSv", label: "mSv" },
  { value: "uSv", label: "µSv" },
];

const UNIT_LABEL: Record<AccumulatedDoseUnit, string> = {
  mSv: "mSv",
  uSv: "µSv",
};

const DOSE_NUMBER_FORMAT = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDoseValue(value: number): string {
  return DOSE_NUMBER_FORMAT.format(value);
}

export function formatAccumulatedDose(
  value: number,
  unit: AccumulatedDoseUnit,
): string {
  return `${formatDoseValue(value)} ${UNIT_LABEL[unit]}`;
}

export function toDoseInMsv(
  value: number,
  unit: AccumulatedDoseUnit,
): number {
  return unit === "mSv" ? value : value / 1000;
}

export function dosePercentOfLimit(
  accumulatedMsv: number,
  maxValue: number,
  maxUnit: AccumulatedDoseUnit,
): number {
  const maxMsv = toDoseInMsv(maxValue, maxUnit);
  if (maxMsv <= 0) return 0;
  return (accumulatedMsv / maxMsv) * 100;
}
