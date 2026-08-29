"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import circle from "@turf/circle";
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  type GeoJSONSource,
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

function getMapStyle(): string | StyleSpecification {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  return custom || OSM_STYLE;
}

type Props = {
  coordinates: [number, number] | null;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
  onSelectPoint: (lngLat: [number, number]) => void;
};

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function ensureZoneLayers(map: Map) {
  const zones: Array<{
    sourceId: string;
    fillId: string;
    color: string;
    opacity: number;
  }> = [
    {
      sourceId: "zone-ii",
      fillId: "zone-ii-fill",
      color: "#f97316",
      opacity: 0.25,
    },
    {
      sourceId: "zone-i",
      fillId: "zone-i-fill",
      color: "#dc2626",
      opacity: 0.35,
    },
  ];

  for (const zone of zones) {
    if (!map.getSource(zone.sourceId)) {
      map.addSource(zone.sourceId, { type: "geojson", data: EMPTY_FC });
    }

    if (!map.getLayer(zone.fillId)) {
      map.addLayer({
        id: zone.fillId,
        type: "fill",
        source: zone.sourceId,
        paint: {
          "fill-color": zone.color,
          "fill-opacity": zone.opacity,
        },
      });
    }

    const outlineId = `${zone.fillId}-outline`;
    if (!map.getLayer(outlineId)) {
      map.addLayer({
        id: outlineId,
        type: "line",
        source: zone.sourceId,
        paint: {
          "line-color": zone.color,
          "line-width": 2,
        },
      });
    }
  }
}

function featureCollectionForCircle(
  center: [number, number],
  radiusMeters: number,
): GeoJSON.FeatureCollection {
  if (!(radiusMeters > 0)) return EMPTY_FC;

  const feature = circle(center, radiusMeters / 1000, {
    steps: 64,
    units: "kilometers",
  });

  return {
    type: "FeatureCollection",
    features: [feature],
  };
}

function syncCircles(
  map: Map,
  center: [number, number] | null,
  radiusI: number,
  radiusII: number,
) {
  const sourceII = map.getSource("zone-ii") as GeoJSONSource | undefined;
  const sourceI = map.getSource("zone-i") as GeoJSONSource | undefined;
  if (!sourceII || !sourceI) return;

  if (!center) {
    sourceII.setData(EMPTY_FC);
    sourceI.setData(EMPTY_FC);
    return;
  }

  sourceII.setData(featureCollectionForCircle(center, radiusII));
  sourceI.setData(featureCollectionForCircle(center, radiusI));
}

function boundsFromCircle(
  center: [number, number],
  radiusMeters: number,
): LngLatBounds | null {
  if (!(radiusMeters > 0)) return null;

  const feature = circle(center, radiusMeters / 1000, {
    steps: 64,
    units: "kilometers",
  });
  const ring = feature.geometry.coordinates[0];
  if (!ring?.length) return null;

  const bounds = new LngLatBounds();
  for (const coord of ring) {
    if (coord.length >= 2) {
      bounds.extend([coord[0], coord[1]]);
    }
  }
  return bounds.isEmpty() ? null : bounds;
}

function fitToCirclesOrPoint(
  map: Map,
  coordinates: [number, number] | null,
  radiusII: number,
) {
  if (coordinates) {
    const zoneBounds = boundsFromCircle(coordinates, radiusII);
    if (zoneBounds) {
      map.fitBounds(zoneBounds, {
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
  const [mapError, setMapError] = useState<string | null>(null);

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
      style: getMapStyle(),
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

    map.on("click", (e: MapMouseEvent) => {
      onSelectRef.current([e.lngLat.lng, e.lngLat.lat]);
    });

    const onStyleReady = () => {
      styleReadyRef.current = true;
      ensureZoneLayers(map);
      syncCircles(
        map,
        coordinatesRef.current,
        radiusIRef.current,
        radiusIIRef.current,
      );
      map.resize();
      if (coordinatesRef.current) {
        fitToCirclesOrPoint(
          map,
          coordinatesRef.current,
          radiusIIRef.current,
        );
      }
    };

    map.on("load", () => {
      setMapError(null);
      onStyleReady();
    });

    map.on("style.load", () => {
      styleReadyRef.current = true;
      ensureZoneLayers(map);
      syncCircles(
        map,
        coordinatesRef.current,
        radiusIRef.current,
        radiusIIRef.current,
      );
    });

    map.on("error", (event) => {
      const message =
        event.error?.message ||
        "No se pudieron cargar los tiles del mapa. Revisa la red o NEXT_PUBLIC_MAP_STYLE_URL.";
      setMapError(message);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    requestAnimationFrame(() => map.resize());
    const resizeTimer = window.setTimeout(() => map.resize(), 150);

    mapRef.current = map;

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      styleReadyRef.current = false;
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
      fitToCirclesOrPoint(map, coordinates, radiusIIRef.current);
    }
  }, [coordinates]);

  // Circles from turf — same pattern as MapLibre draw-a-circle example
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;

    ensureZoneLayers(map);
    syncCircles(map, coordinates, radiusZoneIMeters, radiusZoneIIMeters);
  }, [coordinates, radiusZoneIMeters, radiusZoneIIMeters]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[min(70vh,560px)] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      />
      {mapError && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {mapError}
        </p>
      )}
    </div>
  );
}
