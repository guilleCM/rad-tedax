"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Pencil, Radiation, Flag, FilePen } from "lucide-react";
import type { ZoneFeature } from "@/domain/zones/types";
import { FinalizeOperationButton } from "@/components/interventions/FinalizeOperationButton";
import { Button, Input, Label } from "@/components/ui/forms";
import { Dialog } from "@/components/ui/Dialog";
import type { MapPlacementMode } from "@/components/map/InterventionMap";
import {
  DEFAULT_LIMIT_ZONE_I,
  DEFAULT_LIMIT_ZONE_II,
  type DoseLimitBound,
  type DoseLimitOp,
  type DoseUnit,
  type InterventionStatus,
  type ZoneIILimit,
} from "@/lib/types";
import {
  DOSE_LIMIT_OPS,
  DOSE_UNITS,
  formatZoneILimit,
  formatZoneIILimit,
} from "@/lib/zones/formatDoseLimit";

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
  };
  zones: {
    zoneI: ZoneFeature;
    zoneII: ZoneFeature;
  } | null;
  manualOverrides: {
    zoneI?: ZoneFeature;
    zoneII?: ZoneFeature;
    notes?: string;
    controlPoint?: {
      type: "Point";
      coordinates: [number, number];
    };
  } | null;
};

type EditingZone = "I" | "II" | null;

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
    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
      <div>
        <Label htmlFor={`${idPrefix}-op`}>Operador</Label>
        <select
          id={`${idPrefix}-op`}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
          value={bound.op}
          onChange={(e) =>
            onChange({ ...bound, op: e.target.value as DoseLimitOp })
          }
        >
          {DOSE_LIMIT_OPS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>
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
  colorClass,
  limitText,
  radiusMeters,
  onEdit,
  readOnly,
}: {
  title: string;
  colorClass: string;
  limitText: string;
  radiusMeters: number;
  onEdit: () => void;
  readOnly: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`}
              aria-hidden
            />
            <p className="truncate text-sm font-semibold text-foreground">
              {title}
            </p>
          </div>
          <div className="mt-2 space-y-0.5 pl-4.5 text-xs text-muted">
            <p>
              Límite: <span className="text-foreground/80">{limitText}</span>
            </p>
            <p>
              Radio:{" "}
              <span className="text-foreground/80">{radiusMeters} m</span>
            </p>
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted hover:bg-surface hover:text-foreground"
            aria-label={`Editar ${title}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
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
  const notesId = useId();
  const [status, setStatus] = useState(interventionStatus);
  const [prevInterventionStatus, setPrevInterventionStatus] =
    useState(interventionStatus);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    intervention.location?.point.coordinates ?? null,
  );
  const [controlPoint, setControlPoint] = useState<[number, number] | null>(
    intervention.manualOverrides?.controlPoint?.coordinates ?? null,
  );
  const [radiusI, setRadiusI] = useState(
    intervention.zoneParams.radiusZoneIMeters,
  );
  const [radiusII, setRadiusII] = useState(
    intervention.zoneParams.radiusZoneIIMeters,
  );
  const [limitZoneI, setLimitZoneI] = useState<DoseLimitBound>(
    intervention.zoneParams.limitZoneI ?? DEFAULT_LIMIT_ZONE_I,
  );
  const [limitZoneII, setLimitZoneII] = useState<ZoneIILimit>(
    intervention.zoneParams.limitZoneII ?? DEFAULT_LIMIT_ZONE_II,
  );
  const [notes, setNotes] = useState(
    intervention.manualOverrides?.notes ?? "",
  );
  const [notesOpen, setNotesOpen] = useState(Boolean(notes));
  const [placementMode, setPlacementMode] =
    useState<MapPlacementMode>("none");
  const [toast, setToast] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<EditingZone>(null);
  const [draftRadius, setDraftRadius] = useState(0);
  const [draftLimitI, setDraftLimitI] =
    useState<DoseLimitBound>(DEFAULT_LIMIT_ZONE_I);
  const [draftLimitII, setDraftLimitII] =
    useState<ZoneIILimit>(DEFAULT_LIMIT_ZONE_II);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (interventionStatus !== prevInterventionStatus) {
    setPrevInterventionStatus(interventionStatus);
    setStatus(interventionStatus);
  }

  const effectiveReadOnly = readOnly || status === "closed";

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const onSelectPoint = useCallback(
    (lngLat: [number, number]) => {
      if (effectiveReadOnly) return;
      setCoordinates(lngLat);
      setPlacementMode("none");
      setToast(null);
      setMessage(null);
    },
    [effectiveReadOnly],
  );

  const onSelectControlPoint = useCallback(
    (lngLat: [number, number]) => {
      if (effectiveReadOnly) return;
      setControlPoint(lngLat);
      setPlacementMode("none");
      setToast(null);
      setMessage(null);
    },
    [effectiveReadOnly],
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
    }
    setError(null);
    setEditingZone(null);
  }

  function activateMeasurementPlacement() {
    setPlacementMode("measurement");
    setToast("Pulsa en el mapa donde quieras situar el punto de medición");
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function activateControlPlacement() {
    setPlacementMode("control");
    setToast("Pulsa en el mapa donde quieras situar el punto de control");
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!coordinates) {
      setError("Selecciona un punto de medición en el mapa");
      return;
    }
    if (radiusII < radiusI) {
      setError("El radio de Zona II debe ser mayor o igual al de Zona I");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/interventions/${intervention.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates,
        zoneParams: {
          formulaVersion: intervention.zoneParams.formulaVersion,
          radiusZoneIMeters: radiusI,
          radiusZoneIIMeters: radiusII,
          limitZoneI,
          limitZoneII,
        },
        manualOverrides: {
          notes,
          controlPoint: controlPoint
            ? { type: "Point", coordinates: controlPoint }
            : null,
        },
        recalculate: true,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo guardar");
      return;
    }

    setMessage("Intervención guardada");
    router.refresh();
  }

  return (
    <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="relative">
        <InterventionMap
          coordinates={coordinates}
          controlPoint={controlPoint}
          radiusZoneIMeters={radiusI}
          radiusZoneIIMeters={radiusII}
          placementMode={effectiveReadOnly ? "none" : placementMode}
          onSelectPoint={onSelectPoint}
          onSelectControlPoint={onSelectControlPoint}
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

        <div className="space-y-2">
          <ZoneSummaryCard
            title="Zona I - Medidas Urgentes"
            colorClass="bg-red-500"
            limitText={formatZoneILimit(limitZoneI)}
            radiusMeters={radiusI}
            onEdit={() => startEdit("I")}
            readOnly={effectiveReadOnly}
          />
          <ZoneSummaryCard
            title="Zona II - Alerta"
            colorClass="bg-orange-500"
            limitText={formatZoneIILimit(limitZoneII)}
            radiusMeters={radiusII}
            onEdit={() => startEdit("II")}
            readOnly={effectiveReadOnly}
          />
        </div>

        {!effectiveReadOnly && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={activateMeasurementPlacement}
                className={
                  placementMode === "measurement"
                    ? "flex-1 ring-2 ring-ring"
                    : "flex-1"
                }
              >
                <Radiation className="min-h-4 min-w-4" />
                Punto de medición
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={activateControlPlacement}
                className={
                  placementMode === "control"
                    ? "flex-1 ring-2 ring-ring"
                    : "flex-1"
                }
              >
                <Flag className="min-h-4 min-w-4" />
                Punto de control
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setNotesOpen((open) => !open)}
              aria-expanded={notesOpen}
              aria-controls={notesId}
            >
              <FilePen className="min-h-4 min-w-4" />
              Anotaciones
            </Button>
            {notesOpen && (
              <textarea
                id={notesId}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotaciones adicionales…"
                rows={4}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
              />
            )}
          </div>
        )}

        {!effectiveReadOnly && (
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar intervención"}
            </Button>
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {message && (
          <p className="flex items-start gap-2 rounded-md bg-success px-3 py-2 text-sm text-success-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {message}
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
              min={1}
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
