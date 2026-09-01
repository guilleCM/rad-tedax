"use client";

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
