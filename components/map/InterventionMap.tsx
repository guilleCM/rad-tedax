"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Layers, Search } from "lucide-react";
import {
  Map,
  Marker,
  NavigationControl,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  searchNominatim,
  type NominatimSearchHit,
} from "@/lib/geocoding/nominatim-client";
import {
  computeOverlay,
  createAlertReadingMarkerElement,
  createDangerPointMarkerElement,
  createTacticalPointMarkerElement,
  easeToPoint,
  fitToZonesOrPoint,
  lock2DView,
  styleForBasemap,
  type BasemapId,
  type ZoneOverlay,
} from "@/lib/map/interventionMapShared";
import {
  emptyTacticalPointCoordinates,
  isTacticalPointKind,
  lngLatsFromTacticalPoints,
  type TacticalPointCoordinates,
} from "@/lib/map/tacticalPoints";
import { parseLatLng } from "@/lib/map/parseMapQuery";
import { TACTICAL_POINT_KINDS, type TacticalPointKind } from "@/lib/types";

type SearchMode = "address" | "coordinates";

export type MapPlacementMode =
  | "none"
  | "measurement"
  | "alert-reading"
  | TacticalPointKind;

type Props = {
  coordinates: [number, number] | null;
  tacticalPoints?: TacticalPointCoordinates;
  alertReading?: [number, number] | null;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
  placementMode?: MapPlacementMode;
  onSelectPoint: (lngLat: [number, number]) => void;
  onSelectTacticalPoint?: (
    kind: TacticalPointKind,
    lngLat: [number, number],
  ) => void;
  onSelectAlertReading?: (lngLat: [number, number]) => void;
};

function flyToNominatimHit(map: Map, hit: NominatimSearchHit) {
  const lon = Number.parseFloat(hit.lon);
  const lat = Number.parseFloat(hit.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

  if (hit.boundingbox?.length === 4) {
    const south = Number.parseFloat(hit.boundingbox[0]);
    const north = Number.parseFloat(hit.boundingbox[1]);
    const west = Number.parseFloat(hit.boundingbox[2]);
    const east = Number.parseFloat(hit.boundingbox[3]);
    if (
      Number.isFinite(south) &&
      Number.isFinite(north) &&
      Number.isFinite(west) &&
      Number.isFinite(east)
    ) {
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 48, maxZoom: 17, duration: 500 },
      );
      return;
    }
  }

  easeToPoint(map, [lon, lat]);
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException || error instanceof Error) &&
    error.name === "AbortError"
  );
}

export function InterventionMap({
  coordinates,
  tacticalPoints = emptyTacticalPointCoordinates(),
  alertReading = null,
  radiusZoneIMeters,
  radiusZoneIIMeters,
  placementMode = "none",
  onSelectPoint,
  onSelectTacticalPoint,
  onSelectAlertReading,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const tacticalMarkersRef = useRef<Partial<Record<TacticalPointKind, Marker>>>(
    {},
  );
  const alertMarkerRef = useRef<Marker | null>(null);
  const styleReadyRef = useRef(false);
  const coordinatesRef = useRef(coordinates);
  const tacticalPointsRef = useRef(tacticalPoints);
  const alertReadingRef = useRef(alertReading);
  const radiusIRef = useRef(radiusZoneIMeters);
  const radiusIIRef = useRef(radiusZoneIIMeters);
  const onSelectRef = useRef(onSelectPoint);
  const onSelectTacticalRef = useRef(onSelectTacticalPoint);
  const onSelectAlertRef = useRef(onSelectAlertReading);
  const placementModeRef = useRef(placementMode);
  const hadCoordinatesRef = useRef(Boolean(coordinates));
  const updateOverlayRef = useRef<() => void>(() => {});
  const [mapError, setMapError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("streets");
  const [overlay, setOverlay] = useState<ZoneOverlay | null>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLDivElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("address");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [searchHits, setSearchHits] = useState<NominatimSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastFetchedQuery, setLastFetchedQuery] = useState("");
  const searchPanelId = useId();
  const searchInputId = useId();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchLatRef = useRef<HTMLInputElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const trimmedSearchQuery = searchQuery.trim();

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  useEffect(() => {
    tacticalPointsRef.current = tacticalPoints;
  }, [tacticalPoints]);

  useEffect(() => {
    alertReadingRef.current = alertReading;
  }, [alertReading]);

  useEffect(() => {
    radiusIRef.current = radiusZoneIMeters;
  }, [radiusZoneIMeters]);

  useEffect(() => {
    radiusIIRef.current = radiusZoneIIMeters;
  }, [radiusZoneIIMeters]);

  useEffect(() => {
    onSelectRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    onSelectTacticalRef.current = onSelectTacticalPoint;
  }, [onSelectTacticalPoint]);

  useEffect(() => {
    onSelectAlertRef.current = onSelectAlertReading;
  }, [onSelectAlertReading]);

  useEffect(() => {
    placementModeRef.current = placementMode;
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor =
      placementMode === "none" ? "" : "crosshair";
  }, [placementMode]);

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
      style: styleForBasemap("streets"),
      center: initialCenter,
      zoom: coordinates ? 15 : 6,
      minZoom: 2,
      maxZoom: 19,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      attributionControl: {},
    });

    lock2DView(map);
    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.keyboard.enable();
    map.getCanvas().style.cursor =
      placementModeRef.current === "none" ? "" : "crosshair";

    map.addControl(
      new NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right",
    );

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
      const mode = placementModeRef.current;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (mode === "measurement") {
        onSelectRef.current(lngLat);
      } else if (mode === "alert-reading") {
        onSelectAlertRef.current?.(lngLat);
      } else if (isTacticalPointKind(mode)) {
        onSelectTacticalRef.current?.(mode, lngLat);
      }
    });

    const onStyleReady = (fit: boolean) => {
      styleReadyRef.current = true;
      lock2DView(map);
      map.getCanvas().style.cursor =
        placementModeRef.current === "none" ? "" : "crosshair";
      map.resize();
      refreshOverlay();
      if (fit && coordinatesRef.current) {
        fitToZonesOrPoint(
          map,
          coordinatesRef.current,
          radiusIIRef.current,
          [
            ...lngLatsFromTacticalPoints(tacticalPointsRef.current),
            ...(alertReadingRef.current ? [alertReadingRef.current] : []),
          ],
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

    for (const event of ["move", "zoom"] as const) {
      map.on(event, refreshOverlay);
    }

    map.on("error", (event) => {
      const message =
        event.error?.message ||
        "No se pudieron cargar los tiles del mapa.";
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
    setOverlayHost(container);

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      styleReadyRef.current = false;
      updateOverlayRef.current = () => {};
      markerRef.current?.remove();
      markerRef.current = null;
      for (const marker of Object.values(tacticalMarkersRef.current)) {
        marker?.remove();
      }
      tacticalMarkersRef.current = {};
      alertMarkerRef.current?.remove();
      alertMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setOverlayHost(null);
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
      markerRef.current = new Marker({
        element: createDangerPointMarkerElement(),
        anchor: "center",
      })
        .setLngLat(coordinates)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    const isFirstPoint = !hadCoordinatesRef.current;
    hadCoordinatesRef.current = true;
    if (isFirstPoint && styleReadyRef.current) {
      fitToZonesOrPoint(
        map,
        coordinates,
        radiusIIRef.current,
        [
          ...lngLatsFromTacticalPoints(tacticalPointsRef.current),
          ...(alertReadingRef.current ? [alertReadingRef.current] : []),
        ],
      );
    }

    updateOverlayRef.current();
  }, [coordinates]);

  // Tactical point markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const kind of TACTICAL_POINT_KINDS) {
      const point = tacticalPoints[kind];
      let marker = tacticalMarkersRef.current[kind];

      if (!point) {
        marker?.remove();
        delete tacticalMarkersRef.current[kind];
        continue;
      }

      if (!marker) {
        marker = new Marker({
          element: createTacticalPointMarkerElement(kind),
          anchor: "bottom",
        })
          .setLngLat(point)
          .addTo(map);
        tacticalMarkersRef.current[kind] = marker;
      } else {
        marker.setLngLat(point);
      }
    }
  }, [tacticalPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!alertReading) {
      alertMarkerRef.current?.remove();
      alertMarkerRef.current = null;
      return;
    }

    if (!alertMarkerRef.current) {
      alertMarkerRef.current = new Marker({
        element: createAlertReadingMarkerElement(),
        anchor: "center",
      })
        .setLngLat(alertReading)
        .addTo(map);
    } else {
      alertMarkerRef.current.setLngLat(alertReading);
    }
  }, [alertReading]);

  // Refresh SVG when radii change from the panel
  useEffect(() => {
    updateOverlayRef.current();
  }, [coordinates, radiusZoneIMeters, radiusZoneIIMeters, basemap]);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.requestAnimationFrame(() => {
      if (searchMode === "coordinates") {
        searchLatRef.current?.focus();
      } else {
        searchInputRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [searchOpen, searchMode]);

  function flyToCoordinates(lngLat: [number, number]) {
    const map = mapRef.current;
    if (!map) return;
    easeToPoint(map, lngLat);
  }

  function flyToHit(hit: NominatimSearchHit) {
    const map = mapRef.current;
    if (!map) return;
    flyToNominatimHit(map, hit);
  }

  function selectSearchMode(next: SearchMode) {
    if (next === searchMode) return;
    searchAbortRef.current?.abort();
    setSearchMode(next);
    setSearchHits([]);
    setSearchError(null);
    setSearchLoading(false);
    setLastFetchedQuery("");
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();

    if (searchMode === "coordinates") {
      const coords = parseLatLng(searchLat, searchLng);
      if (!coords) {
        setSearchError("Introduce latitud (-90 a 90) y longitud (-180 a 180)");
        return;
      }
      setSearchError(null);
      flyToCoordinates(coords);
      return;
    }

    if (!trimmedSearchQuery) return;

    if (
      lastFetchedQuery === trimmedSearchQuery &&
      searchHits.length > 0 &&
      !searchError
    ) {
      flyToHit(searchHits[0]);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;
    setSearchLoading(true);
    setSearchError(null);

    void searchNominatim(trimmedSearchQuery, controller.signal)
      .then((hits) => {
        if (controller.signal.aborted) return;
        setSearchHits(hits);
        setLastFetchedQuery(trimmedSearchQuery);
        setSearchLoading(false);
        if (hits.length > 0) flyToHit(hits[0]);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setSearchHits([]);
        setLastFetchedQuery(trimmedSearchQuery);
        setSearchLoading(false);
        setSearchError("No se pudo buscar la dirección");
      });
  }

  function selectBasemap(next: BasemapId) {
    if (next === basemap) return;

    const map = mapRef.current;
    if (!map) return;

    setBasemap(next);
    setMapError(null);
    styleReadyRef.current = false;
    map.setStyle(styleForBasemap(next));
  }

  return (
    <div className="relative">
      <div className="relative h-[min(70vh,560px)] w-full overflow-hidden rounded-lg border border-border bg-surface">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {overlayHost &&
          overlay &&
          (overlay.rI > 0 || overlay.rII > 0) &&
          createPortal(
            <svg
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
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
            </svg>,
            overlayHost,
          )}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[min(100%-1.5rem,22rem)] flex-col items-start gap-2">
          <div className="flex items-start gap-2">
            <div
              className="pointer-events-auto inline-flex items-center overflow-hidden rounded-md border border-border bg-card shadow-sm"
              role="group"
              aria-label="Capas del mapa"
            >
              <span className="flex items-center border-r border-border px-2 text-muted">
                <Layers className="h-3.5 w-3.5" aria-hidden />
              </span>
              <button
                type="button"
                onClick={() => selectBasemap("streets")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  basemap === "streets"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-surface"
                }`}
              >
                Mapa
              </button>
              <button
                type="button"
                onClick={() => selectBasemap("satellite")}
                className={`border-l border-border px-3 py-1.5 text-xs font-medium transition-colors ${
                  basemap === "satellite"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-surface"
                }`}
              >
                Satélite
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className={`pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-border shadow-sm ${
                searchOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted hover:bg-surface hover:text-foreground"
              }`}
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? searchPanelId : undefined}
              aria-label={searchOpen ? "Cerrar búsqueda" : "Buscar en el mapa"}
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {searchOpen && (
            <form
              id={searchPanelId}
              onSubmit={submitSearch}
              className="pointer-events-auto w-full rounded-md border border-border bg-card p-2 shadow-sm"
            >
              <fieldset className="mb-1.5">
                <legend className="sr-only">Tipo de búsqueda</legend>
                <div className="flex gap-3 text-xs text-foreground">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="map-search-mode"
                      value="address"
                      checked={searchMode === "address"}
                      onChange={() => selectSearchMode("address")}
                    />
                    Dirección
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="map-search-mode"
                      value="coordinates"
                      checked={searchMode === "coordinates"}
                      onChange={() => selectSearchMode("coordinates")}
                    />
                    Coordenadas
                  </label>
                </div>
              </fieldset>
              {searchMode === "address" ? (
                <div className="flex gap-1.5">
                  <input
                    id={searchInputId}
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Calle, municipio"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none ring-ring focus:ring-2"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    disabled={searchLoading || !trimmedSearchQuery}
                  >
                    Ir
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <label className="min-w-0 flex-1">
                    <span className="mb-0.5 block text-[10px] font-medium text-muted">
                      Lat
                    </span>
                    <input
                      ref={searchLatRef}
                      type="text"
                      inputMode="decimal"
                      value={searchLat}
                      onChange={(e) => {
                        setSearchLat(e.target.value);
                        setSearchError(null);
                      }}
                      placeholder="40.4168"
                      autoComplete="off"
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none ring-ring focus:ring-2"
                    />
                  </label>
                  <label className="min-w-0 flex-1">
                    <span className="mb-0.5 block text-[10px] font-medium text-muted">
                      Lng
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={searchLng}
                      onChange={(e) => {
                        setSearchLng(e.target.value);
                        setSearchError(null);
                      }}
                      placeholder="-3.7038"
                      autoComplete="off"
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none ring-ring focus:ring-2"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-auto shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    disabled={!searchLat.trim() || !searchLng.trim()}
                  >
                    Ir
                  </button>
                </div>
              )}
              {searchMode === "address" && searchLoading && (
                <p className="mt-1.5 text-xs text-muted">Buscando…</p>
              )}
              {searchError &&
                (searchMode === "coordinates" ||
                  lastFetchedQuery === trimmedSearchQuery) && (
                  <p className="mt-1.5 text-xs text-danger-foreground">
                    {searchError}
                  </p>
                )}
              {searchMode === "address" &&
                !searchLoading &&
                !searchError &&
                trimmedSearchQuery &&
                lastFetchedQuery === trimmedSearchQuery &&
                searchHits.length === 0 && (
                  <p className="mt-1.5 text-xs text-muted">Sin resultados</p>
                )}
              {searchMode === "address" &&
                lastFetchedQuery === trimmedSearchQuery &&
                searchHits.length > 0 && (
                  <ul className="mt-1.5 max-h-40 overflow-y-auto border-t border-border pt-1">
                    {searchHits.map((hit) => (
                      <li key={`${hit.lon},${hit.lat},${hit.display_name}`}>
                        <button
                          type="button"
                          onClick={() => flyToHit(hit)}
                          className="w-full rounded px-1.5 py-1 text-left text-xs text-foreground hover:bg-surface"
                        >
                          {hit.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </form>
          )}
        </div>
      </div>
      {mapError && (
        <p className="mt-2 rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
          {mapError}
        </p>
      )}
    </div>
  );
}
