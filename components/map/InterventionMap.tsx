"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ZoneFeature } from "@/domain/zones/types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type Props = {
  coordinates: [number, number] | null;
  zoneI?: ZoneFeature | null;
  zoneII?: ZoneFeature | null;
  onSelectPoint: (lngLat: [number, number]) => void;
};

function upsertGeoJson(
  map: Map,
  sourceId: string,
  layerId: string,
  feature: ZoneFeature | null | undefined,
  color: string,
  opacity: number,
) {
  const data = {
    type: "FeatureCollection" as const,
    features: feature ? [feature] : [],
  };

  const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(sourceId, { type: "geojson", data });
  map.addLayer({
    id: layerId,
    type: "fill",
    source: sourceId,
    paint: {
      "fill-color": color,
      "fill-opacity": opacity,
    },
  });
  map.addLayer({
    id: `${layerId}-outline`,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": color,
      "line-width": 2,
    },
  });
}

export function InterventionMap({
  coordinates,
  zoneI,
  zoneII,
  onSelectPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelectPoint);
  onSelectRef.current = onSelectPoint;

  const initialCenter = useMemo<[number, number]>(
    () => coordinates ?? [-3.7038, 40.4168],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: initialCenter,
      zoom: coordinates ? 14 : 6,
    });

    map.addControl(new NavigationControl(), "top-right");

    map.on("click", (e: MapMouseEvent) => {
      onSelectRef.current([e.lngLat.lng, e.lngLat.lat]);
    });

    map.on("load", () => {
      upsertGeoJson(map, "zone-ii", "zone-ii-fill", zoneII, "#f97316", 0.25);
      upsertGeoJson(map, "zone-i", "zone-i-fill", zoneI, "#dc2626", 0.35);
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // intentionally mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!coordinates) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new Marker({ color: "#0f172a" })
        .setLngLat(coordinates)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    map.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), 13) });
  }, [coordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    upsertGeoJson(map, "zone-ii", "zone-ii-fill", zoneII, "#f97316", 0.25);
    upsertGeoJson(map, "zone-i", "zone-i-fill", zoneI, "#dc2626", 0.35);
  }, [zoneI, zoneII]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-lg border border-slate-200"
    />
  );
}
