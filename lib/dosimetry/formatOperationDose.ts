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

const SMALL_DOSE_USV_FORMAT = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Below this (mSv), show µSv for readability in live accumulation. */
const SMALL_DOSE_MSV_THRESHOLD = 0.01;

export function formatDoseValue(value: number): string {
  return DOSE_NUMBER_FORMAT.format(value);
}

export function formatAccumulatedDose(
  value: number,
  unit: AccumulatedDoseUnit,
): string {
  return `${formatDoseValue(value)} ${UNIT_LABEL[unit]}`;
}

export function formatAccumulatedDoseMsv(accumulatedMsv: number): string {
  if (
    accumulatedMsv > 0 &&
    accumulatedMsv < SMALL_DOSE_MSV_THRESHOLD
  ) {
    return `${SMALL_DOSE_USV_FORMAT.format(accumulatedMsv * 1000)} µSv`;
  }
  return formatAccumulatedDose(accumulatedMsv, "mSv");
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
