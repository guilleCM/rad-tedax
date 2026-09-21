import {
  TACTICAL_POINT_KINDS,
  type GeoJsonLngLatPoint,
  type ManualOverrides,
  type TacticalPointKind,
} from "@/lib/types";

export type TacticalPointCoordinates = Record<
  TacticalPointKind,
  [number, number] | null
>;

export const TACTICAL_POINT_LABELS: Record<TacticalPointKind, string> = {
  controlPoint: "Punto de control",
  decontaminationStation: "Estación de descontaminación",
  advancedCommandPost: "Puesto de mando avanzado",
  entryExit: "Entrada/Salida",
};

export const TACTICAL_POINT_COLORS: Record<
  TacticalPointKind,
  { fill: string; stroke: string; icon: string }
> = {
  controlPoint: { fill: "#16a34a", stroke: "#14532d", icon: "#fff" },
  decontaminationStation: { fill: "#c026d3", stroke: "#701a75", icon: "#fff" },
  advancedCommandPost: { fill: "#4f46e5", stroke: "#312e81", icon: "#fff" },
  entryExit: { fill: "#111111", stroke: "#ffffff", icon: "#e2e8f0" },
};

export const TACTICAL_POINT_PLACE_HINTS: Record<TacticalPointKind, string> = {
  controlPoint: "Pulsa en el mapa donde quieras situar el punto de control",
  decontaminationStation:
    "Pulsa en el mapa donde quieras situar la estación de descontaminación",
  advancedCommandPost:
    "Pulsa en el mapa donde quieras situar el puesto de mando avanzado",
  entryExit: "Pulsa en el mapa donde quieras situar la entrada/salida",
};

export function emptyTacticalPointCoordinates(): TacticalPointCoordinates {
  return {
    controlPoint: null,
    decontaminationStation: null,
    advancedCommandPost: null,
    entryExit: null,
  };
}

export function tacticalPointsFromOverrides(
  overrides?: Pick<ManualOverrides, TacticalPointKind> | null,
): TacticalPointCoordinates {
  return {
    controlPoint: overrides?.controlPoint?.coordinates ?? null,
    decontaminationStation:
      overrides?.decontaminationStation?.coordinates ?? null,
    advancedCommandPost: overrides?.advancedCommandPost?.coordinates ?? null,
    entryExit: overrides?.entryExit?.coordinates ?? null,
  };
}

export function toGeoJsonPoint(
  coordinates: [number, number] | null,
): GeoJsonLngLatPoint | null {
  return coordinates ? { type: "Point", coordinates } : null;
}

export function tacticalPointsToOverridePayload(
  points: TacticalPointCoordinates,
): Record<TacticalPointKind, GeoJsonLngLatPoint | null> {
  return {
    controlPoint: toGeoJsonPoint(points.controlPoint),
    decontaminationStation: toGeoJsonPoint(points.decontaminationStation),
    advancedCommandPost: toGeoJsonPoint(points.advancedCommandPost),
    entryExit: toGeoJsonPoint(points.entryExit),
  };
}

export function lngLatsFromTacticalPoints(
  points?: Partial<TacticalPointCoordinates> | null,
): [number, number][] {
  if (!points) return [];
  return TACTICAL_POINT_KINDS.flatMap((kind) => {
    const point = points[kind];
    return point ? [point] : [];
  });
}

export function isTacticalPointKind(
  value: string,
): value is TacticalPointKind {
  return (TACTICAL_POINT_KINDS as readonly string[]).includes(value);
}
