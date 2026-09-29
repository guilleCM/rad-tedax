import {
  type MapSketch,
  type SketchColor,
} from "@/lib/types";

export const MAX_SKETCHES = 60;
export const MAX_SKETCH_POINTS = 500;
export const SKETCH_MIN_STEP_PX = 4;
export const SKETCH_LINE_WIDTH = 4.5;
export const SKETCH_CASING_WIDTH = 8;
export const SKETCH_CASING_COLOR = "#0f172a";

export const SKETCH_COLOR_HEX: Record<SketchColor, string> = {
  yellow: "#facc15",
  black: "#111111",
  white: "#f8fafc",
};

export const SKETCH_COLOR_LABELS: Record<SketchColor, string> = {
  yellow: "Amarillo",
  black: "Negro",
  white: "Blanco",
};

export function normalizeSketchColor(color: unknown): SketchColor | null {
  if (color === "blue" || color === "black") return "black";
  if (color === "yellow" || color === "white") return color;
  return null;
}

export function sketchInkHex(color: string): string {
  if (color === "black" || color === "blue") return SKETCH_COLOR_HEX.black;
  if (color === "white") return SKETCH_COLOR_HEX.white;
  return SKETCH_COLOR_HEX.yellow;
}

export function sketchCasingHex(color: string): string {
  return color === "black" || color === "blue" ? "#f8fafc" : SKETCH_CASING_COLOR;
}

export type SketchDraft = {
  color: SketchColor;
  coordinates: [number, number][];
};

function isLngLat(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [lng, lat] = value;
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

export function sketchesFromOverrides(
  overrides?: { sketches?: MapSketch[] | null } | null,
): MapSketch[] {
  if (!overrides?.sketches) return [];

  const sketches: MapSketch[] = [];
  for (const sketch of overrides.sketches) {
    if (!sketch) continue;
    const color = normalizeSketchColor(sketch.color);
    if (!color) continue;
    if (!Array.isArray(sketch.coordinates)) continue;
    const coordinates = sketch.coordinates
      .filter(isLngLat)
      .slice(0, MAX_SKETCH_POINTS);
    if (coordinates.length < 2) continue;
    sketches.push({
      id:
        typeof sketch.id === "string" && sketch.id.trim()
          ? sketch.id
          : crypto.randomUUID(),
      color,
      coordinates,
    });
    if (sketches.length >= MAX_SKETCHES) break;
  }
  return sketches;
}

export function lngLatsFromSketches(
  sketches?: MapSketch[] | null,
): [number, number][] {
  if (!sketches) return [];
  return sketches.flatMap((sketch) => sketch.coordinates);
}

export function isFarEnough(
  last: { x: number; y: number } | null,
  next: { x: number; y: number },
  minStepPx = SKETCH_MIN_STEP_PX,
): boolean {
  if (!last) return true;
  const dx = next.x - last.x;
  const dy = next.y - last.y;
  return dx * dx + dy * dy >= minStepPx * minStepPx;
}

export function sketchPolylinePoints(
  coordinates: [number, number][],
  project: (lngLat: [number, number]) => { x: number; y: number },
): string {
  return coordinates
    .map((lngLat) => {
      const point = project(lngLat);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}
