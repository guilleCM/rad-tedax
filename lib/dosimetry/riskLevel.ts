export type RiskLevel = "BAJO" | "MEDIO" | "ALTO";

export function doseRiskLevel(percent: number): RiskLevel {
  if (percent >= 100) return "ALTO";
  if (percent >= 80) return "MEDIO";
  return "BAJO";
}

export function doseRiskBadgeClass(level: RiskLevel): string {
  switch (level) {
    case "ALTO":
      return "bg-danger text-danger-foreground";
    case "MEDIO":
      return "bg-warning text-warning-foreground";
    case "BAJO":
      return "bg-success text-success-foreground";
  }
}

export function doseRiskLabel(percent: number): {
  text: RiskLevel;
  className: string;
} {
  const text = doseRiskLevel(percent);
  return { text, className: doseRiskBadgeClass(text) };
}
