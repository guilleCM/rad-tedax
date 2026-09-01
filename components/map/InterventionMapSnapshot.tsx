"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { captureMapSnapshot } from "@/lib/reports/captureMapSnapshot";
import {
  fitMapToZonesAndWait,
  lock2DView,
  MAP_SNAPSHOT_HEIGHT,
  MAP_SNAPSHOT_WIDTH,
  STREETS_STYLE,
} from "@/lib/map/interventionMapShared";

export { MAP_SNAPSHOT_HEIGHT, MAP_SNAPSHOT_WIDTH };

export type InterventionMapSnapshotHandle = {
  capture: () => Promise<string | null>;
};

type Props = {
  coordinates: [number, number];
  controlPoint?: [number, number] | null;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
};

export const InterventionMapSnapshot = forwardRef<
  InterventionMapSnapshotHandle,
  Props
>(function InterventionMapSnapshot(
  {
    coordinates,
    controlPoint = null,
    radiusZoneIMeters,
    radiusZoneIIMeters,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const coordinatesRef = useRef(coordinates);
  const controlPointRef = useRef(controlPoint);
  const radiusIRef = useRef(radiusZoneIMeters);
  const radiusIIRef = useRef(radiusZoneIIMeters);
  const readyRef = useRef(false);

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  useEffect(() => {
    controlPointRef.current = controlPoint;
  }, [controlPoint]);

  useEffect(() => {
    radiusIRef.current = radiusZoneIMeters;
  }, [radiusZoneIMeters]);

  useEffect(() => {
    radiusIIRef.current = radiusZoneIIMeters;
  }, [radiusZoneIIMeters]);

  useImperativeHandle(ref, () => ({
    async capture() {
      const map = mapRef.current;
      if (!map) return null;

      const deadline = Date.now() + 8000;
      while (!readyRef.current && Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
      if (!readyRef.current) return null;

      await fitMapToZonesAndWait(
        map,
        coordinatesRef.current,
        radiusIIRef.current,
        controlPointRef.current,
        { padding: 48, maxZoom: 17, duration: 0 },
      );

      return captureMapSnapshot({
        map,
        coordinates: coordinatesRef.current,
        controlPoint: controlPointRef.current,
        radiusZoneIMeters: radiusIRef.current,
        radiusZoneIIMeters: radiusIIRef.current,
      });
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    const map = new Map({
      container,
      style: STREETS_STYLE,
      center: coordinates,
      zoom: 15,
      minZoom: 2,
      maxZoom: 19,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      interactive: false,
      // @ts-expect-error - maplibre-gl types are not fully compatible with TypeScript
      preserveDrawingBuffer: true,
      attributionControl: false,
    });

    lock2DView(map);
    map.scrollZoom.disable();
    map.dragPan.disable();
    map.touchZoomRotate.disable();
    map.doubleClickZoom.disable();
    map.keyboard.disable();

    const onReady = () => {
      lock2DView(map);
      void fitMapToZonesAndWait(
        map,
        coordinatesRef.current,
        radiusIIRef.current,
        controlPointRef.current,
        { padding: 48, maxZoom: 17, duration: 0 },
      ).then(() => {
        readyRef.current = true;
      });
    };

    map.on("load", onReady);
    map.on("style.load", () => {
      lock2DView(map);
      map.resize();
    });

    mapRef.current = map;

    requestAnimationFrame(() => {
      map.resize();
    });

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    void fitMapToZonesAndWait(
      map,
      coordinates,
      radiusZoneIIMeters,
      controlPoint,
      { padding: 48, maxZoom: 17, duration: 0 },
    );
  }, [coordinates, controlPoint, radiusZoneIMeters, radiusZoneIIMeters]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed overflow-hidden"
      style={{
        visibility: "hidden",
        width: MAP_SNAPSHOT_WIDTH,
        height: MAP_SNAPSHOT_HEIGHT,
        top: 0,
        left: 0,
      }}
    >
      <div
        ref={containerRef}
        style={{ width: MAP_SNAPSHOT_WIDTH, height: MAP_SNAPSHOT_HEIGHT }}
      />
    </div>
  );
});
