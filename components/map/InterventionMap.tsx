"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap Contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

type BasemapId = "streets" | "satellite";

type ZoneOverlay = {
  cx: number;
  cy: number;
  rI: number;
  rII: number;
};

function getMaptilerApiKey() {
  return process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim() || "";
}

function getStreetsStyle(): string | StyleSpecification {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  if (custom) return custom;

  const key = getMaptilerApiKey();
  if (key) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`;
  }

  return OSM_STYLE;
}

function getSatelliteStyle(): string | null {
  const key = getMaptilerApiKey();
  if (!key) return null;
  return `https://api.maptiler.com/maps/satellite/style.json?key=${encodeURIComponent(key)}`;
}

function styleForBasemap(basemap: BasemapId): string | StyleSpecification {
  if (basemap === "satellite") {
    return getSatelliteStyle() ?? getStreetsStyle();
  }
  return getStreetsStyle();
}

type Props = {
  coordinates: [number, number] | null;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
  onSelectPoint: (lngLat: [number, number]) => void;
};

/** Offset a lng/lat by meters north (approx. spherical). */
function offsetNorth(
  center: [number, number],
  meters: number,
): [number, number] {
  const dLat = meters / 111_320;
  return [center[0], center[1] + dLat];
}

function metersToPixels(
  map: Map,
  center: [number, number],
  meters: number,
): number {
  if (!(meters > 0)) return 0;
  const p0 = map.project(center);
  const p1 = map.project(offsetNorth(center, meters));
  return Math.hypot(p1.x - p0.x, p1.y - p0.y);
}

function computeOverlay(
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

function boundsAroundPoint(
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

function fitToZonesOrPoint(
  map: Map,
  coordinates: [number, number] | null,
  radiusII: number,
) {
  if (!coordinates) return;

  if (radiusII > 0) {
    map.fitBounds(boundsAroundPoint(coordinates, radiusII), {
      padding: 48,
      maxZoom: 17,
      duration: 500,
    });
    return;
  }

  map.easeTo({
    center: coordinates,
    zoom: Math.max(map.getZoom(), 15),
    duration: 500,
  });
}

export function InterventionMap({
  coordinates,
  radiusZoneIMeters,
  radiusZoneIIMeters,
  onSelectPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const styleReadyRef = useRef(false);
  const coordinatesRef = useRef(coordinates);
  const radiusIRef = useRef(radiusZoneIMeters);
  const radiusIIRef = useRef(radiusZoneIIMeters);
  const onSelectRef = useRef(onSelectPoint);
  const hadCoordinatesRef = useRef(Boolean(coordinates));
  const updateOverlayRef = useRef<() => void>(() => {});
  const [mapError, setMapError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("streets");
  const [overlay, setOverlay] = useState<ZoneOverlay | null>(null);
  const maptilerKey = getMaptilerApiKey();
  const satelliteAvailable = Boolean(maptilerKey);

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  useEffect(() => {
    radiusIRef.current = radiusZoneIMeters;
  }, [radiusZoneIMeters]);

  useEffect(() => {
    radiusIIRef.current = radiusZoneIIMeters;
  }, [radiusZoneIIMeters]);

  useEffect(() => {
    onSelectRef.current = onSelectPoint;
  }, [onSelectPoint]);

  const initialCenter = useMemo<[number, number]>(
    () => coordinates ?? [-3.7038, 40.4168],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    const map = new Map({
      container,
      style: getStreetsStyle(),
      center: initialCenter,
      zoom: coordinates ? 15 : 6,
      minZoom: 2,
      maxZoom: 19,
      attributionControl: {},
    });

    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.keyboard.enable();
    map.getCanvas().style.cursor = "crosshair";

    map.addControl(new NavigationControl({ visualizePitch: false }), "top-right");

    const refreshOverlay = () => {
      setOverlay(
        computeOverlay(
          map,
          coordinatesRef.current,
          radiusIRef.current,
          radiusIIRef.current,
        ),
      );
    };
    updateOverlayRef.current = refreshOverlay;

    map.on("click", (e: MapMouseEvent) => {
      onSelectRef.current([e.lngLat.lng, e.lngLat.lat]);
    });

    const onStyleReady = (fit: boolean) => {
      styleReadyRef.current = true;
      map.getCanvas().style.cursor = "crosshair";
      map.resize();
      refreshOverlay();
      if (fit && coordinatesRef.current) {
        fitToZonesOrPoint(
          map,
          coordinatesRef.current,
          radiusIIRef.current,
        );
      }
    };

    map.on("load", () => {
      setMapError(null);
      onStyleReady(true);
    });

    map.on("style.load", () => {
      onStyleReady(false);
    });

    for (const event of ["move", "zoom", "rotate", "pitch"] as const) {
      map.on(event, refreshOverlay);
    }

    map.on("error", (event) => {
      const message =
        event.error?.message ||
        "No se pudieron cargar los tiles del mapa. Revisa NEXT_PUBLIC_MAPTILER_API_KEY.";
      setMapError(message);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      refreshOverlay();
    });
    resizeObserver.observe(container);

    requestAnimationFrame(() => {
      map.resize();
      refreshOverlay();
    });
    const resizeTimer = window.setTimeout(() => {
      map.resize();
      refreshOverlay();
    }, 150);

    mapRef.current = map;

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      styleReadyRef.current = false;
      updateOverlayRef.current = () => {};
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // intentionally mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marker + fit on first point only
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!coordinates) {
      markerRef.current?.remove();
      markerRef.current = null;
      hadCoordinatesRef.current = false;
      updateOverlayRef.current();
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new Marker({ color: "#0f172a" })
        .setLngLat(coordinates)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    const isFirstPoint = !hadCoordinatesRef.current;
    hadCoordinatesRef.current = true;
    if (isFirstPoint && styleReadyRef.current) {
      fitToZonesOrPoint(map, coordinates, radiusIIRef.current);
    }

    updateOverlayRef.current();
  }, [coordinates]);

  // Refresh SVG when radii change from the panel
  useEffect(() => {
    updateOverlayRef.current();
  }, [coordinates, radiusZoneIMeters, radiusZoneIIMeters, basemap]);

  function selectBasemap(next: BasemapId) {
    if (next === basemap) return;
    if (next === "satellite" && !satelliteAvailable) return;

    const map = mapRef.current;
    if (!map) return;

    setBasemap(next);
    setMapError(null);
    styleReadyRef.current = false;
    map.setStyle(styleForBasemap(next));
  }

  return (
    <div className="relative">
      <div className="relative h-[min(70vh,560px)] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {overlay && (overlay.rI > 0 || overlay.rII > 0) && (
          <svg
            className="pointer-events-none absolute inset-0 z-1 h-full w-full"
            aria-hidden
          >
            {overlay.rII > 0 && (
              <circle
                cx={overlay.cx}
                cy={overlay.cy}
                r={overlay.rII}
                fill="#f97316"
                fillOpacity={0.28}
                stroke="#ea580c"
                strokeWidth={2.5}
              />
            )}
            {overlay.rI > 0 && (
              <circle
                cx={overlay.cx}
                cy={overlay.cy}
                r={overlay.rI}
                fill="#dc2626"
                fillOpacity={0.4}
                stroke="#b91c1c"
                strokeWidth={2.5}
              />
            )}
          </svg>
        )}
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <div
            className="pointer-events-auto inline-flex overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
            role="group"
            aria-label="Capas del mapa"
          >
            <button
              type="button"
              onClick={() => selectBasemap("streets")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                basemap === "streets"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Mapa
            </button>
            <button
              type="button"
              onClick={() => selectBasemap("satellite")}
              disabled={!satelliteAvailable}
              title={
                satelliteAvailable
                  ? "MapTiler Satellite"
                  : "Configura NEXT_PUBLIC_MAPTILER_API_KEY para usar satélite"
              }
              className={`border-l border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                basemap === "satellite"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50 disabled:hover:bg-white"
              }`}
            >
              Satélite
            </button>
          </div>
        </div>
      </div>
      {mapError && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {mapError}
        </p>
      )}
    </div>
  );
}
