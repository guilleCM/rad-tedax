"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Gauge, Icon, Pencil, Radiation, FilePen, Trash2, Undo2 } from "lucide-react";
import type { ZoneFeature } from "@/domain/zones/types";
import { apiFetch } from "@/lib/api-client";
import { reverseGeocodeNominatim } from "@/lib/geocoding/nominatim-client";
import { FinalizeOperationButton } from "@/components/interventions/FinalizeOperationButton";
import { useReportInterventionSave } from "@/components/interventions/InterventionHeaderContext";
import { Button, Input, Label } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";
import type { MapPlacementMode } from "@/components/map/InterventionMap";
import {
  DEFAULT_LIMIT_ZONE_I,
  DEFAULT_LIMIT_ZONE_II,
  TACTICAL_POINT_KINDS,
  type DoseLimitBound,
  type DoseUnit,
  type InterventionStatus,
  type TacticalPointKind,
  type ZoneIILimit,
  type MapSketch,
  type SketchColor,
  SKETCH_COLORS,
} from "@/lib/types";
import {
  TACTICAL_POINT_LABELS,
  TACTICAL_POINT_PLACE_HINTS,
  tacticalPointsFromOverrides,
  tacticalPointsToOverridePayload,
  type TacticalPointCoordinates,
} from "@/lib/map/tacticalPoints";
import { TACTICAL_POINT_ICON_NODES } from "@/lib/map/tacticalPointIcons";
import {
  MAX_SKETCHES,
  SKETCH_COLOR_HEX,
  SKETCH_COLOR_LABELS,
  sketchesFromOverrides,
  type SketchDraft,
} from "@/lib/map/sketches";
import {
  formatAnnotationTime,
  resolveAnnotations,
  type AnnotationRecord,
} from "@/domain/dosimetry/annotations";
import {
  beltCopy,
  distanceMeters,
  INITIAL_CORDON_INNER_METERS,
  INITIAL_CORDON_OUTER_METERS,
  INVERSE_SQUARE_FORMULA,
  radiiFromAlertReading,
  type ZoningPhase,
} from "@/domain/zones/inverseSquare";
import {
  DOSE_UNITS,
  formatZoneILimit,
  formatZoneIILimit,
} from "@/lib/zones/formatDoseLimit";

const TACTICAL_POINT_BORDER: Record<TacticalPointKind, string> = {
  controlPoint: "!border-green-600",
  decontaminationStation: "!border-fuchsia-600",
  advancedCommandPost: "!border-indigo-600",
  entryExit:
    "!border-[3px] !border-transparent !text-slate-100 ![background-image:linear-gradient(#1e293b,#1e293b),repeating-linear-gradient(45deg,#22c55e_0_4px,#111111_4px_8px)] ![background-clip:padding-box,border-box] ![background-origin:border-box] hover:![background-image:linear-gradient(#334155,#334155),repeating-linear-gradient(45deg,#22c55e_0_4px,#111111_4px_8px)]",
};

const InterventionMap = dynamic(
  () =>
    import("@/components/map/InterventionMap").then((m) => m.InterventionMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,560px)] items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
        Cargando mapa…
      </div>
    ),
  },
);

type SerializedIntervention = {
  id: string;
  name: string;
  occurredAt?: string;
  location: {
    point: { type: "Point"; coordinates: [number, number] };
    label: string | null;
  } | null;
  zoneParams: {
    formulaVersion: string;
    radiusZoneIMeters: number;
    radiusZoneIIMeters: number;
    limitZoneI?: DoseLimitBound;
    limitZoneII?: ZoneIILimit;
    zoningPhase?: ZoningPhase;
    zoneIEstimated?: boolean;
  };
  zones: {
    zoneI: ZoneFeature;
    zoneII: ZoneFeature;
  } | null;
  manualOverrides: {
    zoneI?: ZoneFeature;
    zoneII?: ZoneFeature;
    notes?: string;
    annotations?: Array<{
      text: string;
      createdAt?: string | null;
    }>;
    controlPoint?: {
      type: "Point";
      coordinates: [number, number];
    };
    decontaminationStation?: {
      type: "Point";
      coordinates: [number, number];
    };
    advancedCommandPost?: {
      type: "Point";
      coordinates: [number, number];
    };
    entryExit?: {
      type: "Point";
      coordinates: [number, number];
    };
    alertReading?: {
      type: "Point";
      coordinates: [number, number];
    };
    sketches?: MapSketch[];
  } | null;
};

type EditingZone = "I" | "II" | null;

type MapPersistSnapshot = {
  coordinates: [number, number] | null;
  tacticalPoints: TacticalPointCoordinates;
  alertReading: [number, number] | null;
  radiusI: number;
  radiusII: number;
  limitZoneI: DoseLimitBound;
  limitZoneII: ZoneIILimit;
  annotations: AnnotationRecord[];
  zoningPhase: ZoningPhase;
  zoneIEstimated: boolean;
  formulaVersion: string;
  sketches: MapSketch[];
  locationLabel: string;
};

function loadAnnotations(intervention: SerializedIntervention): AnnotationRecord[] {
  return resolveAnnotations(intervention.manualOverrides).map((annotation) => ({
    text: annotation.text,
    createdAt:
      annotation.createdAt ?? intervention.occurredAt ?? new Date().toISOString(),
  }));
}

function serializePersistPayload(snapshot: MapPersistSnapshot): string {
  return JSON.stringify(snapshot);
}

function buildPersistBody(snapshot: MapPersistSnapshot) {
  return {
    coordinates: snapshot.coordinates,
    zoneParams: {
      formulaVersion: snapshot.formulaVersion,
      radiusZoneIMeters: snapshot.radiusI,
      radiusZoneIIMeters: snapshot.radiusII,
      limitZoneI: snapshot.limitZoneI,
      limitZoneII: snapshot.limitZoneII,
      zoningPhase: snapshot.zoningPhase,
      zoneIEstimated: snapshot.zoneIEstimated,
    },
    manualOverrides: {
      notes: "",
      annotations: snapshot.annotations.flatMap((annotation) =>
        annotation.createdAt
          ? [{ text: annotation.text, createdAt: annotation.createdAt }]
          : [],
      ),
      ...tacticalPointsToOverridePayload(snapshot.tacticalPoints),
      alertReading: snapshot.alertReading
        ? { type: "Point" as const, coordinates: snapshot.alertReading }
        : null,
      sketches: snapshot.sketches,
    },
    recalculate: true,
    locationLabel: snapshot.locationLabel,
  };
}


function DoseBoundFields({
  idPrefix,
  bound,
  onChange,
}: {
  idPrefix: string;
  bound: DoseLimitBound;
  onChange: (next: DoseLimitBound) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label htmlFor={`${idPrefix}-value`}>Valor</Label>
        <Input
          id={`${idPrefix}-value`}
          type="number"
          min={0}
          step="any"
          value={bound.value}
          onChange={(e) =>
            onChange({ ...bound, value: Number(e.target.value) })
          }
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-unit`}>Unidad</Label>
        <select
          id={`${idPrefix}-unit`}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
          value={bound.unit}
          onChange={(e) =>
            onChange({ ...bound, unit: e.target.value as DoseUnit })
          }
        >
          {DOSE_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ZoneSummaryCard({
  title,
  tone,
  limitText,
  note,
  radiusMeters,
  onEdit,
  readOnly,
}: {
  title: string;
  tone: "red" | "orange";
  limitText: string | null;
  note: string | null;
  radiusMeters: number;
  onEdit: () => void;
  readOnly: boolean;
}) {
  const toneClass =
    tone === "red"
      ? "border-2 border-red-500 bg-surface"
      : "border-2 border-orange-500 bg-surface";
  const dotClass = tone === "red" ? "bg-red-500" : "bg-orange-500";

  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
            aria-hidden
          />
          <p className="truncate text-sm font-semibold text-foreground">
            {title}
          </p>
        </div>
        <div className="mt-2 space-y-0.5 pl-4.5 text-xs text-muted">
          {limitText && (
            <p>
              Límite: <span className="text-foreground/80">{limitText}</span>
            </p>
          )}
          {note && <p>{note}</p>}
          <p>
            Radio:{" "}
            <span className="text-foreground/80">{radiusMeters} m</span>
          </p>
        </div>
      </div>
      {!readOnly && (
        <Pencil className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
      )}
    </div>
  );

  if (readOnly) {
    return (
      <div className={`rounded-lg border p-3 ${toneClass}`}>{body}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className={`w-full rounded-lg border p-3 text-left ${toneClass}`}
      aria-label={`Editar ${title}`}
    >
      {body}
    </button>
  );
}

export function InterventionMapPanel({
  intervention,
  interventionStatus,
  readOnly = false,
}: {
  intervention: SerializedIntervention;
  interventionStatus: InterventionStatus;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const reportSaveState = useReportInterventionSave();
  const notesId = useId();
  const [status, setStatus] = useState(interventionStatus);
  const [prevInterventionStatus, setPrevInterventionStatus] =
    useState(interventionStatus);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    intervention.location?.point.coordinates ?? null,
  );
  const [locationLabel, setLocationLabel] = useState(
    intervention.location?.label ?? "",
  );
  const [tacticalPoints, setTacticalPoints] = useState<TacticalPointCoordinates>(
    tacticalPointsFromOverrides(intervention.manualOverrides),
  );
  const [alertReading, setAlertReading] = useState<[number, number] | null>(
    intervention.manualOverrides?.alertReading?.coordinates ?? null,
  );
  const [radiusI, setRadiusI] = useState(
    intervention.zoneParams.radiusZoneIMeters,
  );
  const [radiusII, setRadiusII] = useState(
    intervention.zoneParams.radiusZoneIIMeters,
  );
  const [zoningPhase, setZoningPhase] = useState<ZoningPhase>(
    intervention.zoneParams.zoningPhase ?? "measured",
  );
  const [zoneIEstimated, setZoneIEstimated] = useState(
    intervention.zoneParams.zoneIEstimated ?? false,
  );
  const [formulaVersion, setFormulaVersion] = useState(
    intervention.zoneParams.formulaVersion,
  );
  const [limitZoneI, setLimitZoneI] = useState<DoseLimitBound>(
    intervention.zoneParams.limitZoneI ?? DEFAULT_LIMIT_ZONE_I,
  );
  const [limitZoneII, setLimitZoneII] = useState<ZoneIILimit>(
    intervention.zoneParams.limitZoneII ?? DEFAULT_LIMIT_ZONE_II,
  );
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>(() =>
    loadAnnotations(intervention),
  );
  const [sketches, setSketches] = useState<MapSketch[]>(() =>
    sketchesFromOverrides(intervention.manualOverrides),
  );
  const [sketchColor, setSketchColor] = useState<SketchColor>("yellow");
  const [clearSketchesArmed, setClearSketchesArmed] = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState("");
  const [notesOpen, setNotesOpen] = useState(
    () => loadAnnotations(intervention).length > 0,
  );
  const [placementMode, setPlacementMode] =
    useState<MapPlacementMode>("none");
  const [toast, setToast] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<EditingZone>(null);
  const [draftRadius, setDraftRadius] = useState(0);
  const [draftLimitI, setDraftLimitI] =
    useState<DoseLimitBound>(DEFAULT_LIMIT_ZONE_I);
  const [draftLimitII, setDraftLimitII] =
    useState<ZoneIILimit>(DEFAULT_LIMIT_ZONE_II);
  const [error, setError] = useState<string | null>(null);

  const savingRef = useRef(false);
  const pendingPersistRef = useRef(false);
  const pendingOverridesRef = useRef<Partial<MapPersistSnapshot> | null>(null);
  const placeLookupRef = useRef(0);
  const placeLabelEditedRef = useRef(false);
  const lastSavedPayloadRef = useRef(
    serializePersistPayload({
      coordinates: intervention.location?.point.coordinates ?? null,
      tacticalPoints: tacticalPointsFromOverrides(intervention.manualOverrides),
      alertReading:
        intervention.manualOverrides?.alertReading?.coordinates ?? null,
      radiusI: intervention.zoneParams.radiusZoneIMeters,
      radiusII: intervention.zoneParams.radiusZoneIIMeters,
      limitZoneI: intervention.zoneParams.limitZoneI ?? DEFAULT_LIMIT_ZONE_I,
      limitZoneII: intervention.zoneParams.limitZoneII ?? DEFAULT_LIMIT_ZONE_II,
      annotations: loadAnnotations(intervention),
      zoningPhase: intervention.zoneParams.zoningPhase ?? "measured",
      zoneIEstimated: intervention.zoneParams.zoneIEstimated ?? false,
      formulaVersion: intervention.zoneParams.formulaVersion,
      sketches: sketchesFromOverrides(intervention.manualOverrides),
      locationLabel: intervention.location?.label ?? "",
    }),
  );

  if (interventionStatus !== prevInterventionStatus) {
    setPrevInterventionStatus(interventionStatus);
    setStatus(interventionStatus);
  }

  const effectiveReadOnly = readOnly || status === "closed";

  const getSnapshot = useCallback(
    (overrides: Partial<MapPersistSnapshot> = {}): MapPersistSnapshot => ({
      coordinates,
      tacticalPoints,
      alertReading,
      radiusI,
      radiusII,
      limitZoneI,
      limitZoneII,
      annotations,
      zoningPhase,
      zoneIEstimated,
      formulaVersion,
      sketches,
      locationLabel,
      ...overrides,
    }),
    [
      coordinates,
      tacticalPoints,
      alertReading,
      radiusI,
      radiusII,
      limitZoneI,
      limitZoneII,
      annotations,
      zoningPhase,
      zoneIEstimated,
      formulaVersion,
      sketches,
      locationLabel,
    ],
  );

  const persistMapStateRef = useRef<
    (overrides?: Partial<MapPersistSnapshot>) => Promise<boolean>
  >(() => Promise.resolve(false));

  const persistMapState = useCallback(
    async (overrides: Partial<MapPersistSnapshot> = {}): Promise<boolean> => {
      if (effectiveReadOnly) return false;

      const snapshot = getSnapshot(overrides);
      const serialized = serializePersistPayload(snapshot);

      if (serialized === lastSavedPayloadRef.current) return true;

      if (!snapshot.coordinates) {
        setError(
          "Selecciona una fuente radiológica para guardar la zonificación",
        );
        return false;
      }

      if (snapshot.radiusII < snapshot.radiusI) {
        setError("El radio de Zona II debe ser mayor o igual al de Zona I");
        return false;
      }

      if (savingRef.current) {
        pendingOverridesRef.current = {
          ...(pendingOverridesRef.current ?? {}),
          ...overrides,
        };
        pendingPersistRef.current = true;
        return false;
      }

      savingRef.current = true;
      reportSaveState("saving");
      setError(null);

      const result = await apiFetch(`/api/interventions/${intervention.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPersistBody(snapshot)),
      });
      savingRef.current = false;

      const flushPending = () => {
        if (!pendingPersistRef.current) return;
        const pending = pendingOverridesRef.current ?? {};
        pendingOverridesRef.current = null;
        pendingPersistRef.current = false;
        void persistMapStateRef.current(pending);
      };

      if (!result.ok) {
        reportSaveState("idle");
        setError(result.error.message);
        flushPending();
        return false;
      }

      lastSavedPayloadRef.current = serialized;
      reportSaveState("saved");
      router.refresh();
      flushPending();

      return true;
    },
    [
      effectiveReadOnly,
      getSnapshot,
      intervention,
      reportSaveState,
      router,
    ],
  );

  useEffect(() => {
    persistMapStateRef.current = persistMapState;
  }, [persistMapState]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const refreshPlaceLabel = useCallback(
    (lngLat: [number, number]) => {
      placeLabelEditedRef.current = false;
      const requestId = ++placeLookupRef.current;
      void reverseGeocodeNominatim(lngLat[0], lngLat[1])
        .then((label) => {
          if (
            requestId !== placeLookupRef.current ||
            placeLabelEditedRef.current ||
            !label
          ) {
            return;
          }
          setLocationLabel(label);
          void persistMapState({ coordinates: lngLat, locationLabel: label });
        })
        .catch(() => {
          // Si no hay calle nueva, se conserva el lugar anterior.
        });
    },
    [persistMapState],
  );

  const onSelectPoint = useCallback(
    (lngLat: [number, number]) => {
      if (effectiveReadOnly) return;

      if (alertReading) {
        const radii = radiiFromAlertReading(distanceMeters(lngLat, alertReading));
        if (!radii) {
          setError("La fuente queda demasiado cerca de la lectura de 100 µSv/h");
          return;
        }
        setCoordinates(lngLat);
        setRadiusI(radii.radiusZoneIMeters);
        setRadiusII(radii.radiusZoneIIMeters);
        setZoningPhase("measured");
        setZoneIEstimated(true);
        setFormulaVersion(INVERSE_SQUARE_FORMULA);
        setPlacementMode("none");
        setError(null);
        setToast(
          `Zona II a ${radii.radiusZoneIIMeters} m. Zona I estimada a ${radii.radiusZoneIMeters} m.`,
        );
        void persistMapState({
          coordinates: lngLat,
          radiusI: radii.radiusZoneIMeters,
          radiusII: radii.radiusZoneIIMeters,
          zoningPhase: "measured",
          zoneIEstimated: true,
          formulaVersion: INVERSE_SQUARE_FORMULA,
        });
        refreshPlaceLabel(lngLat);
        return;
      }

      const firstPlacement = coordinates === null;
      const nextRadiusI = firstPlacement ? INITIAL_CORDON_INNER_METERS : radiusI;
      const nextRadiusII = firstPlacement ? INITIAL_CORDON_OUTER_METERS : radiusII;
      const nextPhase: ZoningPhase = firstPlacement ? "initial-cordon" : zoningPhase;

      setCoordinates(lngLat);
      setRadiusI(nextRadiusI);
      setRadiusII(nextRadiusII);
      setZoningPhase(nextPhase);
      if (firstPlacement) {
        setZoneIEstimated(false);
        setFormulaVersion("v1-placeholder");
      }
      setPlacementMode("none");
      setToast(null);
      setError(null);
      void persistMapState({
        coordinates: lngLat,
        radiusI: nextRadiusI,
        radiusII: nextRadiusII,
        zoningPhase: nextPhase,
        ...(firstPlacement
          ? { zoneIEstimated: false, formulaVersion: "v1-placeholder" }
          : {}),
      });
      refreshPlaceLabel(lngLat);
    },
    [alertReading, coordinates, effectiveReadOnly, persistMapState, radiusI, radiusII, refreshPlaceLabel, zoningPhase],
  );

  const onSelectAlertReading = useCallback(
    (lngLat: [number, number]) => {
      if (effectiveReadOnly) return;
      if (!coordinates) {
        setPlacementMode("none");
        setError("Sitúa primero la fuente radiológica");
        return;
      }

      const radii = radiiFromAlertReading(distanceMeters(coordinates, lngLat));
      if (!radii) {
        setError("La lectura está demasiado cerca de la fuente radiológica");
        return;
      }

      setAlertReading(lngLat);
      setRadiusI(radii.radiusZoneIMeters);
      setRadiusII(radii.radiusZoneIIMeters);
      setZoningPhase("measured");
      setZoneIEstimated(true);
      setFormulaVersion(INVERSE_SQUARE_FORMULA);
      setPlacementMode("none");
      setError(null);
      setToast(
        `Zona II a ${radii.radiusZoneIIMeters} m. Zona I estimada a ${radii.radiusZoneIMeters} m.`,
      );
      void persistMapState({
        alertReading: lngLat,
        radiusI: radii.radiusZoneIMeters,
        radiusII: radii.radiusZoneIIMeters,
        zoningPhase: "measured",
        zoneIEstimated: true,
        formulaVersion: INVERSE_SQUARE_FORMULA,
      });
    },
    [coordinates, effectiveReadOnly, persistMapState],
  );

  const onSelectTacticalPoint = useCallback(
    (kind: TacticalPointKind, lngLat: [number, number]) => {
      if (effectiveReadOnly) return;
      const nextPoints = { ...tacticalPoints, [kind]: lngLat };
      setTacticalPoints(nextPoints);
      setPlacementMode("none");
      setToast(null);
      setError(null);
      void persistMapState({ tacticalPoints: nextPoints });
    },
    [effectiveReadOnly, persistMapState, tacticalPoints],
  );

  function startEdit(zone: "I" | "II") {
    setEditingZone(zone);
    if (zone === "I") {
      setDraftRadius(radiusI);
      setDraftLimitI(limitZoneI);
    } else {
      setDraftRadius(radiusII);
      setDraftLimitII(limitZoneII);
    }
  }

  function applyEdit() {
    if (editingZone === "I") {
      if (!(draftRadius > 0)) {
        setError("El radio debe ser positivo");
        return;
      }
      if (draftRadius > radiusII) {
        setError("El radio de Zona I no puede superar el de Zona II");
        return;
      }
      setRadiusI(draftRadius);
      setLimitZoneI(draftLimitI);
      setZoneIEstimated(false);
      setFormulaVersion("v1-placeholder");
      setError(null);
      setEditingZone(null);
      void persistMapState({
        radiusI: draftRadius,
        limitZoneI: draftLimitI,
        zoneIEstimated: false,
        formulaVersion: "v1-placeholder",
      });
    } else if (editingZone === "II") {
      if (!(draftRadius > 0)) {
        setError("El radio debe ser positivo");
        return;
      }
      if (draftRadius < radiusI) {
        setError("El radio de Zona II debe ser mayor o igual al de Zona I");
        return;
      }
      setRadiusII(draftRadius);
      setLimitZoneII(draftLimitII);
      setZoneIEstimated(false);
      setFormulaVersion("v1-placeholder");
      setError(null);
      setEditingZone(null);
      void persistMapState({
        radiusII: draftRadius,
        limitZoneII: draftLimitII,
        zoneIEstimated: false,
        formulaVersion: "v1-placeholder",
      });
    }
  }

  function activateMeasurementPlacement() {
    setPlacementMode("measurement");
    setToast("Pulsa en el mapa donde quieras situar la fuente radiológica");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function activateAlertReadingPlacement() {
    if (!coordinates) {
      setError("Sitúa primero la fuente radiológica");
      return;
    }
    setPlacementMode("alert-reading");
    setToast("Pulsa en el mapa donde el radiámetro marque 100 µSv/h");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function activateTacticalPlacement(kind: TacticalPointKind) {
    setPlacementMode(kind);
    setClearSketchesArmed(false);
    setToast(TACTICAL_POINT_PLACE_HINTS[kind]);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function activateDraw() {
    if (!coordinates) {
      setError("Sitúa primero la fuente radiológica");
      return;
    }
    setClearSketchesArmed(false);
    if (placementMode === "draw") {
      setPlacementMode("none");
      setToast(null);
      return;
    }
    setPlacementMode("draw");
    setToast("Dibuja con un dedo o el lápiz. Con dos dedos mueves el mapa.");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function commitSketch(draft: SketchDraft) {
    if (effectiveReadOnly || draft.coordinates.length < 2) return;
    const next = [
      ...sketches,
      {
        id: crypto.randomUUID(),
        color: draft.color,
        coordinates: draft.coordinates,
      },
    ].slice(-MAX_SKETCHES);
    setSketches(next);
    setClearSketchesArmed(false);
    setError(null);
    void persistMapState({ sketches: next });
  }

  function undoSketch() {
    const next = sketches.slice(0, -1);
    setSketches(next);
    setClearSketchesArmed(false);
    void persistMapState({ sketches: next });
  }

  function clearSketches() {
    if (!clearSketchesArmed) {
      setClearSketchesArmed(true);
      return;
    }
    setClearSketchesArmed(false);
    setSketches([]);
    void persistMapState({ sketches: [] });
  }

  function addAnnotation() {
    const text = annotationDraft.trim();
    if (!text) return;
    const next = [
      ...annotations,
      { text, createdAt: new Date().toISOString() },
    ];
    setAnnotations(next);
    setAnnotationDraft("");
    setNotesOpen(true);
    setError(null);
    void persistMapState({ annotations: next });
  }

  function removeAnnotation(index: number) {
    const next = annotations.filter((_, itemIndex) => itemIndex !== index);
    setAnnotations(next);
    void persistMapState({ annotations: next });
  }

  const belt = beltCopy(zoningPhase, zoneIEstimated);

  return (
    <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="relative">
        <InterventionMap
          coordinates={coordinates}
          tacticalPoints={tacticalPoints}
          alertReading={alertReading}
          radiusZoneIMeters={radiusI}
          radiusZoneIIMeters={radiusII}
          placementMode={effectiveReadOnly ? "none" : placementMode}
          sketches={sketches}
          sketchColor={sketchColor}
          onCommitSketch={commitSketch}
          onSelectPoint={onSelectPoint}
          onSelectTacticalPoint={onSelectTacticalPoint}
          onSelectAlertReading={onSelectAlertReading}
        />
        {toast && (
          <div
            role="status"
            className="pointer-events-none absolute left-1/2 top-3 z-20 max-w-[min(90%,28rem)] -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-center text-sm text-foreground shadow-lg"
          >
            {toast}
          </div>
        )}
      </div>

      <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="!mb-2">
          <span className="text-sm font-medium text-foreground mr-2">Coordenadas:</span>
          <span className="font-mono text-xs text-foreground">
            {coordinates
              ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
              : "[lng, lat]"}
          </span>
        </div>

        <div>
          <Label htmlFor="place-label">Ubicación</Label>
          <Input
            id="place-label"
            value={locationLabel}
            maxLength={200}
            disabled={effectiveReadOnly}
            placeholder="Calle o referencia"
            onChange={(event) => {
              placeLabelEditedRef.current = true;
              setLocationLabel(event.target.value);
            }}
            onBlur={() => {
              const next = locationLabel.trim();
              setLocationLabel(next);
              void persistMapState({ locationLabel: next });
            }}
          />
          <p className="mt-1 text-xs text-muted">
            Al mover la fuente se propone la calle nueva. Puedes corregirla.
          </p>
        </div>

        <div className="space-y-2">
          {zoningPhase === "initial-cordon" && (
            <p className="text-xs text-muted">
              Cinturón de espera hasta medir 100 µSv/h.
            </p>
          )}
          <ZoneSummaryCard
            title={belt.innerTitle}
            tone="red"
            limitText={
              zoningPhase === "initial-cordon" ? null : formatZoneILimit(limitZoneI)
            }
            note={belt.innerNote}
            radiusMeters={radiusI}
            onEdit={() => startEdit("I")}
            readOnly={effectiveReadOnly}
          />
          <ZoneSummaryCard
            title={belt.outerTitle}
            tone="orange"
            limitText={
              zoningPhase === "initial-cordon"
                ? null
                : formatZoneIILimit(limitZoneII)
            }
            note={belt.outerNote}
            radiusMeters={radiusII}
            onEdit={() => startEdit("II")}
            readOnly={effectiveReadOnly}
          />
        </div>

        {!effectiveReadOnly && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={activateMeasurementPlacement}
              className={
                placementMode === "measurement"
                  ? "w-full !border-2 !border-black !bg-yellow-400 !text-black ring-2 ring-black hover:!bg-yellow-300"
                  : "w-full !border-2 !border-black !bg-yellow-400 !text-black hover:!bg-yellow-300"
              }
            >
              <Radiation className="min-h-4 min-w-4 fill-black stroke-black" />
              Fuente radiológica
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={activateAlertReadingPlacement}
              className={
                placementMode === "alert-reading"
                  ? "w-full !border-2 !border-blue-800 !bg-blue-600 !text-white ring-2 ring-blue-300 hover:!bg-blue-500"
                  : "w-full !border-2 !border-blue-800 !bg-blue-600 !text-white hover:!bg-blue-500"
              }
            >
              <Gauge className="min-h-4 min-w-4" />
              Lectura 100 µSv/h
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {TACTICAL_POINT_KINDS.map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  variant="secondary"
                  onClick={() => activateTacticalPlacement(kind)}
                  className={
                    placementMode === kind
                      ? `h-auto min-h-10 flex-col gap-1 px-2 py-2 text-center text-xs leading-tight ring-2 ring-ring sm:text-sm ${kind === "entryExit" ? "" : "!border-2"} ${TACTICAL_POINT_BORDER[kind]}`
                      : `h-auto min-h-10 flex-col gap-1 px-2 py-2 text-center text-xs leading-tight sm:text-sm ${kind === "entryExit" ? "" : "!border-2"} ${TACTICAL_POINT_BORDER[kind]}`
                  }
                >
                  <Icon
                    iconNode={TACTICAL_POINT_ICON_NODES[kind]}
                    className="min-h-4 min-w-4"
                  />
                  {TACTICAL_POINT_LABELS[kind]}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={activateDraw}
              className={
                placementMode === "draw"
                  ? "w-full !border-2 !border-white ring-2 ring-ring"
                  : "w-full !border-2 !border-white"
              }
            >
              <Pencil className="min-h-4 min-w-4" />
              Dibujar
              {sketches.length > 0 ? ` (${sketches.length})` : ""}
            </Button>
            {placementMode === "draw" && (
              <div className="space-y-2">
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Color del trazo"
                >
                  {SKETCH_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={SKETCH_COLOR_LABELS[color]}
                      aria-pressed={sketchColor === color}
                      onClick={() => setSketchColor(color)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        sketchColor === color
                          ? "ring-2 ring-ring"
                          : ""
                      } ${
                        color === "black"
                          ? "border-slate-200"
                          : sketchColor === color
                            ? "border-foreground"
                            : "border-border"
                      }`}
                      style={{ backgroundColor: SKETCH_COLOR_HEX[color] }}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    className="ml-auto h-8 px-2"
                    onClick={undoSketch}
                    disabled={sketches.length === 0}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Deshacer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-2"
                    onClick={clearSketches}
                    disabled={sketches.length === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {clearSketchesArmed ? "¿Borrar?" : "Borrar"}
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  Un dedo o el lápiz dibuja. Dos dedos mueven el mapa.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full !border-2 !border-white"
            onClick={() => setNotesOpen((open) => !open)}
            aria-expanded={notesOpen}
            aria-controls={notesId}
            disabled={effectiveReadOnly && annotations.length === 0}
          >
            <FilePen className="min-h-4 min-w-4" />
            Anotaciones
            {annotations.length > 0 ? ` (${annotations.length})` : ""}
          </Button>
          {notesOpen && (
            <div id={notesId} className="space-y-2">
              {annotations.length === 0 ? (
                <p className="text-xs text-muted">Sin anotaciones.</p>
              ) : (
                <ul className="space-y-2">
                  {annotations.map((annotation, index) => {
                    const time = formatAnnotationTime(annotation.createdAt);
                    return (
                      <li
                        key={`${annotation.createdAt}-${index}`}
                        className="flex items-start gap-2 rounded-md bg-surface px-2 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          {time && (
                            <p className="font-mono text-[11px] text-muted">
                              {time}
                            </p>
                          )}
                          <p className="text-sm text-foreground">
                            {annotation.text}
                          </p>
                        </div>
                        {!effectiveReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeAnnotation(index)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-card hover:text-foreground"
                            aria-label={`Quitar anotación: ${annotation.text}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {!effectiveReadOnly && (
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addAnnotation();
                  }}
                >
                  <textarea
                    value={annotationDraft}
                    onChange={(event) => setAnnotationDraft(event.target.value)}
                    placeholder="Qué ha pasado…"
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
                  />
                  <Button type="submit" variant="secondary" className="w-full">
                    Añadir anotación
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </aside>

      <Dialog
        open={editingZone !== null}
        onClose={() => setEditingZone(null)}
        title={
          editingZone === "I"
            ? "Editar Zona I"
            : editingZone === "II"
              ? "Editar Zona II"
              : "Editar zona"
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-radius">Radio (m)</Label>
            <Input
              id="edit-radius"
              type="number"
              min={0}
              value={draftRadius}
              onChange={(e) => setDraftRadius(Number(e.target.value))}
            />
          </div>

          {editingZone === "I" && (
            <div>
              <Label>Límite</Label>
              <DoseBoundFields
                idPrefix="limit-i"
                bound={draftLimitI}
                onChange={setDraftLimitI}
              />
            </div>
          )}

          {editingZone === "II" && (
            <>
              <div>
                <Label>Límite inferior</Label>
                <DoseBoundFields
                  idPrefix="limit-ii-lower"
                  bound={draftLimitII.lower}
                  onChange={(lower) =>
                    setDraftLimitII((prev) => ({ ...prev, lower }))
                  }
                />
              </div>
              <div>
                <Label>Límite superior</Label>
                <DoseBoundFields
                  idPrefix="limit-ii-upper"
                  bound={draftLimitII.upper}
                  onChange={(upper) =>
                    setDraftLimitII((prev) => ({ ...prev, upper }))
                  }
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingZone(null)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={applyEdit}>
              Aplicar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>

    <FinalizeOperationButton
      interventionId={intervention.id}
      status={status}
      readOnly={readOnly}
      onClosed={() => setStatus("closed")}
    />
    </div>
  );
}
