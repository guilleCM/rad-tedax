import type { Map } from "maplibre-gl";
import {
  computeOverlay,
  getMapCssDimensions,
  waitForMapIdle,
  ZONE_OVERLAY_COLORS,
  MAP_IDLE_TIMEOUT_MS,
  type ZoneOverlay,
} from "@/lib/map/interventionMapShared";

const JPEG_QUALITY = 0.85;

const DANGER_POINT_SIZE = 30;
const CONTROL_POINT_SIZE = 26;

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

function drawControlPointMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  const size = CONTROL_POINT_SIZE;
  const half = size / 2;

  ctx.save();
  ctx.translate(x, y - half);
  ctx.fillStyle = "#16a34a";
  ctx.strokeStyle = "#14532d";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(half, size * 0.15);
  ctx.bezierCurveTo(half, size * 0.15, size * 0.85, size * 0.55, size * 0.85, size * 0.75);
  ctx.bezierCurveTo(size * 0.85, size * 0.9, half, size, half, size);
  ctx.bezierCurveTo(half, size, size * 0.15, size * 0.9, size * 0.15, size * 0.75);
  ctx.bezierCurveTo(size * 0.15, size * 0.55, half, size * 0.15, half, size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(half, size);
  ctx.lineTo(half, size * 1.15);
  ctx.stroke();
  ctx.restore();
}

export type CaptureMapSnapshotInput = {
  map: Map;
  coordinates: [number, number];
  controlPoint?: [number, number] | null;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
};

export async function captureMapSnapshot(
  input: CaptureMapSnapshotInput,
): Promise<string | null> {
  const { map, coordinates, controlPoint, radiusZoneIMeters, radiusZoneIIMeters } =
    input;

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

    const dangerImg = await loadImage("/danger-point.png");
    const interventionPoint = map.project(coordinates);
    ctx.drawImage(
      dangerImg,
      interventionPoint.x - DANGER_POINT_SIZE / 2,
      interventionPoint.y - DANGER_POINT_SIZE / 2,
      DANGER_POINT_SIZE,
      DANGER_POINT_SIZE,
    );

    if (controlPoint) {
      const controlProjected = map.project(controlPoint);
      drawControlPointMarker(ctx, controlProjected.x, controlProjected.y);
    }

    return composite.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return null;
  }
}
