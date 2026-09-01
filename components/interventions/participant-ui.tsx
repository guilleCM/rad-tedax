"use client";

import type { LucideIcon } from "lucide-react";
import { ZONE_UI } from "@/components/interventions/operation-participant-types";
import type { AccumulatedDoseUnit, ActiveZone } from "@/lib/types";
import {
  formatAccumulatedDose,
} from "@/lib/dosimetry/formatOperationDose";

const DOSE_PERCENT_FORMAT = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const AVATAR_COLORS = [
  "bg-emerald-600 text-white",
  "bg-orange-600 text-white",
  "bg-sky-600 text-white",
  "bg-violet-600 text-white",
  "bg-rose-600 text-white",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ParticipantAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const colorClass = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  const sizeClass =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-12 w-12 text-sm"
        : "h-10 w-10 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${colorClass} ${sizeClass}`}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}

export function SummaryStatCard({
  title,
  subtitle,
  value,
  valueSuffix,
  detail,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  value: string;
  valueSuffix?: string;
  detail?: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const interactive = Boolean(onClick) && !disabled;
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={interactive ? false : undefined}
      className={`flex w-full items-start justify-between gap-1.5 rounded-lg border border-border bg-card p-4 text-left ${
        interactive
          ? "cursor-pointer transition-colors hover:bg-surface"
          : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">
            {subtitle}
          </p>
        )}
        <p className="mt-2 text-xl font-semibold text-foreground">
          {value}
          {valueSuffix && (
            <span className="ml-1 text-base font-normal text-muted">
              {valueSuffix}
            </span>
          )}
        </p>
        {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
      </div>
      <Icon
        className="mt-1 h-6 w-6 shrink-0 text-accent"
        aria-hidden
      />
    </Wrapper>
  );
}

function progressBarColor(percent: number): string {
  if (percent >= 100) return "bg-danger-foreground";
  if (percent >= 80) return "bg-warning-foreground";
  return "bg-success-foreground";
}

export function ZoneRadioToggle({
  name,
  value,
  onChange,
  disabled = false,
}: {
  name: string;
  value: ActiveZone;
  onChange: (zone: ActiveZone) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Zona radiológica"
      className="flex flex-col gap-1"
    >
      {(["I", "II"] as ActiveZone[]).map((zone) => {
        const styles = ZONE_UI[zone];
        const selected = value === zone;
        return (
          <button
            key={zone}
            type="button"
            role="radio"
            aria-checked={selected}
            name={name}
            disabled={disabled}
            onClick={() => onChange(zone)}
            className={`flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${
              selected
                ? styles.selected
                : "border-border text-muted hover:bg-surface"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                selected ? styles.dotFilled : styles.dotOutline
              }`}
              aria-hidden
            />
            {styles.label}
          </button>
        );
      })}
    </div>
  );
}

export function ParticipantDoseProgressRow({
  rateLabel,
  timeLabel,
  percent,
}: {
  rateLabel: string;
  timeLabel: string;
  percent: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const displayPercent = DOSE_PERCENT_FORMAT.format(percent);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        <span>Tasa área: {rateLabel}</span>
        <span className="mx-1.5" aria-hidden>
          ·
        </span>
        <span>Tiempo en zona: {timeLabel}</span>
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Dosis acumulada: ${displayPercent}% del límite`}
      >
        <div
          className={`h-full rounded-full transition-all ${progressBarColor(percent)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-muted">{displayPercent}% del límite</p>
    </div>
  );
}

export function TeamDoseProgressCard({
  accumulatedMsv,
  maxValue,
  maxUnit,
  percent,
}: {
  accumulatedMsv: number;
  maxValue: number;
  maxUnit: AccumulatedDoseUnit;
  percent: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const displayPercent = DOSE_PERCENT_FORMAT.format(percent);
  const limitLabel = formatAccumulatedDose(maxValue, maxUnit);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Dosis acumulada del equipo
      </p>
      <div>
        <p className="text-xl font-semibold text-foreground">
          {formatAccumulatedDose(accumulatedMsv, "mSv")}
        </p>
        <p className="mt-1 text-sm text-muted">
          {displayPercent}% del límite total
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Dosis acumulada del equipo"
      >
        <div
          className={`h-full rounded-full transition-all ${progressBarColor(percent)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>0</span>
        <span>{limitLabel}</span>
      </div>
    </div>
  );
}

export function DoseProgressBar({
  label,
  valueLabel,
  percent,
  hint,
}: {
  label: string;
  valueLabel: string;
  percent: number;
  hint?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="text-right text-sm font-semibold text-foreground">
          {valueLabel}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
