import { LngLatBounds, type Map, type StyleSpecification } from "maplibre-gl";
import {
  TACTICAL_POINT_COLORS,
  TACTICAL_POINT_LABELS,
} from "@/lib/map/tacticalPoints";
import {
  TACTICAL_POINT_ICON_PATHS,
  TACTICAL_POINT_ICON_VIEWBOX,
  tacticalIconPathStrokes,
} from "@/lib/map/tacticalPointIcons";
import type { TacticalPointKind } from "@/lib/types";

export const STREETS_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    streets: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles &copy; Esri",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "streets",
      type: "raster",
      source: "streets",
    },
  ],
};

export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
    },
  ],
};

export type BasemapId = "streets" | "satellite";

export type ZoneOverlay = {
  cx: number;
  cy: number;
  rI: number;
  rII: number;
};

export function styleForBasemap(basemap: BasemapId): StyleSpecification {
  return basemap === "satellite" ? SATELLITE_STYLE : STREETS_STYLE;
}

export function lock2DView(map: Map) {
  map.setPitch(0);
  map.setBearing(0);
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  map.touchPitch.disable();
  map.keyboard.disableRotation();
}

export function createAlertReadingMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Lectura 100 µSv/h");
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "9999px";
  el.style.border = "2px solid #a16207";
  el.style.background = "rgba(250, 204, 21, 0.85)";
  el.style.boxShadow = "0 1px 2px rgba(0,0,0,0.45)";
  return el;
}

export function createDangerPointMarkerElement(): HTMLImageElement {
  const img = document.createElement("img");
  img.src = "/danger-point.png";
  img.alt = "Fuente radiológica";
  img.width = 30;
  img.height = 30;
  img.draggable = false;
  return img;
}

export const TACTICAL_MARKER_WIDTH = 28;
export const TACTICAL_MARKER_HEIGHT = 36;
/** Lado del icono dentro de la cabeza del pin, en unidades del marcador. */
export const TACTICAL_MARKER_ICON_SIZE = 15;
export const TACTICAL_MARKER_HEAD_CENTER = { x: 14, y: 12.6 };
export const TACTICAL_MARKER_PIN_PATH =
  "M14 1.5c6.35 0 11.5 5.15 11.5 11.5 0 8.6-11.5 21-11.5 21S2.5 21.6 2.5 13C2.5 6.65 7.65 1.5 14 1.5z";

export function createTacticalPointMarkerElement(
  kind: TacticalPointKind,
): HTMLDivElement {
  const el = document.createElement("div");
  const colors = TACTICAL_POINT_COLORS[kind];
  const scale = TACTICAL_MARKER_ICON_SIZE / TACTICAL_POINT_ICON_VIEWBOX;
  const offsetX = TACTICAL_MARKER_HEAD_CENTER.x - TACTICAL_MARKER_ICON_SIZE / 2;
  const offsetY = TACTICAL_MARKER_HEAD_CENTER.y - TACTICAL_MARKER_ICON_SIZE / 2;
  const iconPaths = TACTICAL_POINT_ICON_PATHS[kind]
    .map((d, index) => {
      const stroke = tacticalIconPathStrokes(kind, colors.icon)[index];
      return `<path d="${d}" stroke="${stroke}"/>`;
    })
    .join("");

  el.setAttribute("aria-label", TACTICAL_POINT_LABELS[kind]);
  el.style.width = `${TACTICAL_MARKER_WIDTH}px`;
  el.style.height = `${TACTICAL_MARKER_HEIGHT}px`;
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.45))";
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${TACTICAL_MARKER_WIDTH}" height="${TACTICAL_MARKER_HEIGHT}" viewBox="0 0 ${TACTICAL_MARKER_WIDTH} ${TACTICAL_MARKER_HEIGHT}" aria-hidden="true"><path d="${TACTICAL_MARKER_PIN_PATH}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1.5"/><g transform="translate(${offsetX} ${offsetY}) scale(${scale})" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</g></svg>`;
  return el;
}

/** Offset a lng/lat by meters north (approx. spherical). */
export function offsetNorth(
  center: [number, number],
  meters: number,
): [number, number] {
  const dLat = meters / 111_320;
  return [center[0], center[1] + dLat];
}

export function metersToPixels(
  map: Map,
  center: [number, number],
  meters: number,
): number {
  if (!(meters > 0)) return 0;
  const p0 = map.project(center);
  const p1 = map.project(offsetNorth(center, meters));
  return Math.hypot(p1.x - p0.x, p1.y - p0.y);
}

export function computeOverlay(
  map: Map,
  center: [number, number] | null,
  radiusI: number,
  radiusII: number,
): ZoneOverlay | null {
  if (!center) return null;
  const projected = map.project(center);
  return {
    cx: projected.x,
    cy: projected.y,
    rI: metersToPixels(map, center, radiusI),
    rII: metersToPixels(map, center, radiusII),
  };
}

export function boundsAroundPoint(
  center: [number, number],
  radiusMeters: number,
): LngLatBounds {
  const pad = Math.max(radiusMeters, 50);
  const north = offsetNorth(center, pad);
  const south = offsetNorth(center, -pad);
  const metersPerDegLng =
    111_320 * Math.cos((center[1] * Math.PI) / 180);
  const dLng = pad / Math.max(metersPerDegLng, 1e-6);
  const bounds = new LngLatBounds();
  bounds.extend([center[0] - dLng, south[1]]);
  bounds.extend([center[0] + dLng, north[1]]);
  return bounds;
}

export function fitToZonesOrPoint(
  map: Map,
  coordinates: [number, number] | null,
  radiusII: number,
  extraPoints?: Array<[number, number] | null | undefined>,
  options?: { padding?: number; maxZoom?: number; duration?: number },
) {
  if (!coordinates) return;

  const bounds =
    radiusII > 0
      ? boundsAroundPoint(coordinates, radiusII)
      : (() => {
          const b = new LngLatBounds();
          b.extend(coordinates);
          return b;
        })();

  for (const point of extraPoints ?? []) {
    if (point) bounds.extend(point);
  }

  map.fitBounds(bounds, {
    padding: options?.padding ?? 48,
    maxZoom: options?.maxZoom ?? 17,
    duration: options?.duration ?? 500,
  });
}

export function easeToPoint(map: Map, lngLat: [number, number]) {
  map.easeTo({
    center: lngLat,
    zoom: Math.max(map.getZoom(), 15),
    duration: 500,
  });
}

export const ZONE_OVERLAY_COLORS = {
  zoneII: {
    fill: "#f97316",
    fillOpacity: 0.28,
    stroke: "#ea580c",
    strokeWidth: 2.5,
  },
  zoneI: {
    fill: "#dc2626",
    fillOpacity: 0.4,
    stroke: "#b91c1c",
    strokeWidth: 2.5,
  },
} as const;

export const MAP_SNAPSHOT_WIDTH = 800;
export const MAP_SNAPSHOT_HEIGHT = 450;

export const MAP_IDLE_TIMEOUT_MS = 8000;

export function getMapCssDimensions(map: Map): {
  width: number;
  height: number;
} {
  const canvas = map.getCanvas();
  return {
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  };
}

export function waitForMapIdle(
  map: Map,
  timeoutMs: number = MAP_IDLE_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Map idle timed out"));
    }, timeoutMs);

    const onIdle = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      map.off("idle", onIdle);
    };

    if (map.loaded() && !map.isMoving()) {
      cleanup();
      resolve();
      return;
    }

    map.once("idle", onIdle);
  });
}

export async function fitMapToZonesAndWait(
  map: Map,
  coordinates: [number, number],
  radiusII: number,
  extraPoints?: Array<[number, number] | null | undefined>,
  options?: { padding?: number; maxZoom?: number; duration?: number },
): Promise<void> {
  map.resize();
  fitToZonesOrPoint(map, coordinates, radiusII, extraPoints, options);
  await waitForMapIdle(map);
}
