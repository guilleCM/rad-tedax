import type { Map } from "maplibre-gl";
import {
  computeOverlay,
  getMapCssDimensions,
  waitForMapIdle,
  ZONE_OVERLAY_COLORS,
  MAP_IDLE_TIMEOUT_MS,
  type ZoneOverlay,
} from "@/lib/map/interventionMapShared";
import {
  TACTICAL_POINT_COLORS,
  type TacticalPointCoordinates,
} from "@/lib/map/tacticalPoints";
import {
  TACTICAL_POINT_ICON_PATHS,
  TACTICAL_POINT_ICON_VIEWBOX,
  tacticalIconPathStrokes,
} from "@/lib/map/tacticalPointIcons";
import { TACTICAL_POINT_KINDS, type MapSketch, type TacticalPointKind } from "@/lib/types";
import {
  SKETCH_CASING_WIDTH,
  SKETCH_LINE_WIDTH,
  sketchCasingHex,
  sketchInkHex,
} from "@/lib/map/sketches";

const JPEG_QUALITY = 0.85;

const DANGER_POINT_SIZE = 30;
const TACTICAL_PIN_WIDTH = 22;
const TACTICAL_PIN_HEIGHT = 28;
const TACTICAL_PIN_ICON_SIZE = 12;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function drawZoneCircles(
  ctx: CanvasRenderingContext2D,
  overlay: ZoneOverlay,
) {
  if (overlay.rII > 0) {
    const colors = ZONE_OVERLAY_COLORS.zoneII;
    ctx.beginPath();
    ctx.arc(overlay.cx, overlay.cy, overlay.rII, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.globalAlpha = colors.fillOpacity;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = colors.strokeWidth;
    ctx.stroke();
  }

  if (overlay.rI > 0) {
    const colors = ZONE_OVERLAY_COLORS.zoneI;
    ctx.beginPath();
    ctx.arc(overlay.cx, overlay.cy, overlay.rI, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.globalAlpha = colors.fillOpacity;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = colors.strokeWidth;
    ctx.stroke();
  }
}

function drawTacticalPointMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: TacticalPointKind,
) {
  const width = TACTICAL_PIN_WIDTH;
  const height = TACTICAL_PIN_HEIGHT;
  const colors = TACTICAL_POINT_COLORS[kind];

  ctx.save();
  ctx.translate(x - width / 2, y - height);

  ctx.beginPath();
  ctx.moveTo(width / 2, height);
  ctx.bezierCurveTo(width * 0.12, height * 0.62, 1, height * 0.38, 1, height * 0.34);
  ctx.arc(width / 2, height * 0.34, width / 2 - 1, Math.PI, 0, false);
  ctx.bezierCurveTo(
    width - 1,
    height * 0.38,
    width * 0.88,
    height * 0.62,
    width / 2,
    height,
  );
  ctx.closePath();
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();

  const scale = TACTICAL_PIN_ICON_SIZE / TACTICAL_POINT_ICON_VIEWBOX;
  ctx.translate(
    width / 2 - TACTICAL_PIN_ICON_SIZE / 2,
    height * 0.34 - TACTICAL_PIN_ICON_SIZE / 2,
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const iconStrokes = tacticalIconPathStrokes(kind, colors.icon);
  TACTICAL_POINT_ICON_PATHS[kind].forEach((d, index) => {
    ctx.strokeStyle = iconStrokes[index];
    ctx.stroke(new Path2D(d));
  });

  ctx.restore();
}

function drawSketches(
  ctx: CanvasRenderingContext2D,
  map: Map,
  sketches: MapSketch[],
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const sketch of sketches) {
    if (sketch.coordinates.length < 2) continue;
    ctx.beginPath();
    sketch.coordinates.forEach((lngLat, index) => {
      const point = map.project(lngLat);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = sketchCasingHex(sketch.color);
    ctx.lineWidth = SKETCH_CASING_WIDTH;
    ctx.stroke();
    ctx.strokeStyle = sketchInkHex(sketch.color);
    ctx.lineWidth = SKETCH_LINE_WIDTH;
    ctx.stroke();
  }
}

export type CaptureMapSnapshotInput = {
  map: Map;
  coordinates: [number, number];
  tacticalPoints?: TacticalPointCoordinates | null;
  alertReading?: [number, number] | null;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
  sketches?: MapSketch[] | null;
};

export async function captureMapSnapshot(
  input: CaptureMapSnapshotInput,
): Promise<string | null> {
  const {
    map,
    coordinates,
    tacticalPoints,
    alertReading,
    radiusZoneIMeters,
    radiusZoneIIMeters,
    sketches,
  } = input;

  try {
    await waitForMapIdle(map, MAP_IDLE_TIMEOUT_MS);
    map.triggerRepaint();
    await waitForMapIdle(map, MAP_IDLE_TIMEOUT_MS);

    const mapCanvas = map.getCanvas();
    const { width, height } = getMapCssDimensions(map);
    if (width <= 0 || height <= 0) return null;

    const overlay = computeOverlay(
      map,
      coordinates,
      radiusZoneIMeters,
      radiusZoneIIMeters,
    );

    const composite = document.createElement("canvas");
    composite.width = width;
    composite.height = height;
    const ctx = composite.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(mapCanvas, 0, 0, width, height);

    if (overlay) {
      drawZoneCircles(ctx, overlay);
    }

    if (sketches && sketches.length > 0) {
      drawSketches(ctx, map, sketches);
    }

    const dangerImg = await loadImage("/danger-point.png");
    const interventionPoint = map.project(coordinates);
    ctx.drawImage(
      dangerImg,
      interventionPoint.x - DANGER_POINT_SIZE / 2,
      interventionPoint.y - DANGER_POINT_SIZE / 2,
      DANGER_POINT_SIZE,
      DANGER_POINT_SIZE,
    );

    for (const kind of TACTICAL_POINT_KINDS) {
      const point = tacticalPoints?.[kind];
      if (!point) continue;
      const projected = map.project(point);
      drawTacticalPointMarker(ctx, projected.x, projected.y, kind);
    }

    if (alertReading) {
      const reading = map.project(alertReading);
      ctx.beginPath();
      ctx.arc(reading.x, reading.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250, 204, 21, 0.85)";
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    return composite.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return null;
  }
}
