"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Layers, Search } from "lucide-react";
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  searchNominatim,
  type NominatimSearchHit,
} from "@/lib/geocoding/nominatim-client";
import { parseLatLng } from "@/lib/map/parseMapQuery";

const STREETS_STYLE: StyleSpecification = {
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

const SATELLITE_STYLE: StyleSpecification = {
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

type BasemapId = "streets" | "satellite";
type SearchMode = "address" | "coordinates";

type ZoneOverlay = {
  cx: number;
  cy: number;
  rI: number;
  rII: number;
};

function styleForBasemap(basemap: BasemapId): StyleSpecification {
  return basemap === "satellite" ? SATELLITE_STYLE : STREETS_STYLE;
}

function lock2DView(map: Map) {
  map.setPitch(0);
  map.setBearing(0);
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  map.touchPitch.disable();
  map.keyboard.disableRotation();
}

function createDangerPointMarkerElement(): HTMLImageElement {
  const img = document.createElement("img");
  img.src = "/danger-point.png";
  img.alt = "Punto de intervención";
  img.width = 30;
  img.height = 30;
  img.draggable = false;
  return img;
}

function createControlPointMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Punto de control");
  el.style.width = "28px";
  el.style.height = "28px";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.45))";
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="#16a34a" stroke="#14532d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;
  return el;
}

export type MapPlacementMode = "none" | "measurement" | "control";

type Props = {
  coordinates: [number, number] | null;
  controlPoint?: [number, number] | null;
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
  placementMode?: MapPlacementMode;
  onSelectPoint: (lngLat: [number, number]) => void;
  onSelectControlPoint?: (lngLat: [number, number]) => void;
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

function easeToPoint(map: Map, lngLat: [number, number]) {
  map.easeTo({
    center: lngLat,
    zoom: Math.max(map.getZoom(), 15),
    duration: 500,
  });
}

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
  controlPoint = null,
  radiusZoneIMeters,
  radiusZoneIIMeters,
  placementMode = "none",
  onSelectPoint,
  onSelectControlPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const controlMarkerRef = useRef<Marker | null>(null);
  const styleReadyRef = useRef(false);
  const coordinatesRef = useRef(coordinates);
  const radiusIRef = useRef(radiusZoneIMeters);
  const radiusIIRef = useRef(radiusZoneIIMeters);
  const onSelectRef = useRef(onSelectPoint);
  const onSelectControlRef = useRef(onSelectControlPoint);
  const placementModeRef = useRef(placementMode);
  const hadCoordinatesRef = useRef(Boolean(coordinates));
  const updateOverlayRef = useRef<() => void>(() => {});
  const [mapError, setMapError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("streets");
  const [overlay, setOverlay] = useState<ZoneOverlay | null>(null);
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
    radiusIRef.current = radiusZoneIMeters;
  }, [radiusZoneIMeters]);

  useEffect(() => {
    radiusIIRef.current = radiusZoneIIMeters;
  }, [radiusZoneIIMeters]);

  useEffect(() => {
    onSelectRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    onSelectControlRef.current = onSelectControlPoint;
  }, [onSelectControlPoint]);

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
      } else if (mode === "control") {
        onSelectControlRef.current?.(lngLat);
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

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      styleReadyRef.current = false;
      updateOverlayRef.current = () => {};
      markerRef.current?.remove();
      markerRef.current = null;
      controlMarkerRef.current?.remove();
      controlMarkerRef.current = null;
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
      fitToZonesOrPoint(map, coordinates, radiusIIRef.current);
    }

    updateOverlayRef.current();
  }, [coordinates]);

  // Control point marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!controlPoint) {
      controlMarkerRef.current?.remove();
      controlMarkerRef.current = null;
      return;
    }

    if (!controlMarkerRef.current) {
      controlMarkerRef.current = new Marker({
        element: createControlPointMarkerElement(),
        anchor: "bottom",
      })
        .setLngLat(controlPoint)
        .addTo(map);
    } else {
      controlMarkerRef.current.setLngLat(controlPoint);
    }
  }, [controlPoint]);

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
