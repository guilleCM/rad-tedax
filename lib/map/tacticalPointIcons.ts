import type { IconNode } from "lucide-react";
import type { TacticalPointKind } from "@/lib/types";

/**
 * Trazos de los iconos Lucide (flag, droplets, landmark, arrow-left-right) en
 * viewBox 24x24. Se guardan como datos porque el marcador del mapa se crea con
 * DOM imperativo y el snapshot del informe se dibuja en canvas, donde no se
 * pueden renderizar componentes React.
 */
export const TACTICAL_POINT_ICON_PATHS: Record<
  TacticalPointKind,
  readonly string[]
> = {
  controlPoint: [
    "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",
  ],
  decontaminationStation: [
    "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",
    "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",
  ],
  advancedCommandPost: [
    "M10 18v-7",
    "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z",
    "M14 18v-7",
    "M18 18v-7",
    "M3 22h18",
    "M6 18v-7",
  ],
  entryExit: ["M8 3 4 7l4 4", "M4 7h16", "m16 21 4-4-4-4", "M20 17H4"],
};

export const TACTICAL_POINT_ICON_VIEWBOX = 24;

function toIconNode(paths: readonly string[]): IconNode {
  return paths.map((d): IconNode[number] => ["path", { d }]);
}

export const TACTICAL_POINT_ICON_NODES: Record<TacticalPointKind, IconNode> = {
  controlPoint: toIconNode(TACTICAL_POINT_ICON_PATHS.controlPoint),
  decontaminationStation: toIconNode(
    TACTICAL_POINT_ICON_PATHS.decontaminationStation,
  ),
  advancedCommandPost: toIconNode(
    TACTICAL_POINT_ICON_PATHS.advancedCommandPost,
  ),
  entryExit: toIconNode(TACTICAL_POINT_ICON_PATHS.entryExit),
};

/** Flecha superior en verde y flecha inferior en rojo. */
export const ENTRY_EXIT_ARROW_COLORS = {
  upper: "#22c55e",
  lower: "#ef4444",
} as const;

export function tacticalIconPathStrokes(
  kind: TacticalPointKind,
  fallback: string,
): string[] {
  const paths = TACTICAL_POINT_ICON_PATHS[kind];
  if (kind !== "entryExit") return paths.map(() => fallback);
  return paths.map((_, index) =>
    index < 2 ? ENTRY_EXIT_ARROW_COLORS.upper : ENTRY_EXIT_ARROW_COLORS.lower,
  );
}
