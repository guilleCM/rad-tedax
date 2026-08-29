"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateZones } from "@/domain/zones/calculateZones";
import type { ZoneFeature } from "@/domain/zones/types";
import { Button, Input, Label } from "@/components/ui/forms";

const InterventionMap = dynamic(
  () =>
    import("@/components/map/InterventionMap").then((m) => m.InterventionMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
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
  };
  zones: {
    zoneI: ZoneFeature;
    zoneII: ZoneFeature;
  } | null;
  manualOverrides: {
    zoneI?: ZoneFeature;
    zoneII?: ZoneFeature;
    notes?: string;
  } | null;
};

export function InterventionMapPanel({
  intervention,
}: {
  intervention: SerializedIntervention;
}) {
  const router = useRouter();
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    intervention.location?.point.coordinates ?? null,
  );
  const [radiusI, setRadiusI] = useState(
    intervention.zoneParams.radiusZoneIMeters,
  );
  const [radiusII, setRadiusII] = useState(
    intervention.zoneParams.radiusZoneIIMeters,
  );
  const [notes, setNotes] = useState(
    intervention.manualOverrides?.notes ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewZones = useMemo(() => {
    if (!coordinates) {
      return {
        zoneI: intervention.manualOverrides?.zoneI ?? intervention.zones?.zoneI,
        zoneII:
          intervention.manualOverrides?.zoneII ?? intervention.zones?.zoneII,
      };
    }

    const result = calculateZones({
      point: coordinates,
      zoneParams: {
        formulaVersion: intervention.zoneParams.formulaVersion,
        radiusZoneIMeters: radiusI,
        radiusZoneIIMeters: radiusII,
      },
    });

    return {
      zoneI: intervention.manualOverrides?.zoneI ?? result.zoneI,
      zoneII: intervention.manualOverrides?.zoneII ?? result.zoneII,
    };
  }, [coordinates, radiusI, radiusII, intervention]);

  const onSelectPoint = useCallback((lngLat: [number, number]) => {
    setCoordinates(lngLat);
    setMessage(null);
  }, []);

  async function save() {
    if (!coordinates) {
      setError("Selecciona un punto en el mapa");
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
        },
        manualOverrides: { notes: notes || undefined },
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

  async function recalculate() {
    setSaving(true);
    setError(null);
    const res = await fetch(
      `/api/interventions/${intervention.id}/recalculate`,
      { method: "POST" },
    );
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error?.message ?? "No se pudo recalcular");
      return;
    }
    if (json.data.location?.point?.coordinates) {
      setCoordinates(json.data.location.point.coordinates);
    }
    setRadiusI(json.data.zoneParams.radiusZoneIMeters);
    setRadiusII(json.data.zoneParams.radiusZoneIIMeters);
    setMessage("Zonas recalculadas en servidor");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div>
        <InterventionMap
          coordinates={coordinates}
          zoneI={previewZones.zoneI}
          zoneII={previewZones.zoneII}
          onSelectPoint={onSelectPoint}
        />
        <p className="mt-2 text-sm text-slate-500">
          Haz clic en el mapa para seleccionar el punto de la intervención.
        </p>
      </div>

      <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <Label>Coordenadas [lng, lat]</Label>
          <p className="font-mono text-xs text-slate-700">
            {coordinates
              ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
              : "Sin seleccionar"}
          </p>
        </div>
        <div>
          <Label htmlFor="radiusI">Radio Zona I (m)</Label>
          <Input
            id="radiusI"
            type="number"
            min={1}
            value={radiusI}
            onChange={(e) => setRadiusI(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="radiusII">Radio Zona II (m)</Label>
          <Input
            id="radiusII"
            type="number"
            min={1}
            value={radiusII}
            onChange={(e) => setRadiusII(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="notes">Notas / ajustes</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar intervención"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={recalculate}
            disabled={saving || !coordinates}
          >
            Recalcular en servidor
          </Button>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <div className="space-y-1 text-xs text-slate-500">
          <p>
            <span className="inline-block h-2 w-2 rounded-full bg-red-600" />{" "}
            Zona I — Medidas Urgentes
          </p>
          <p>
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />{" "}
            Zona II — Alerta
          </p>
          <p>Fórmula: {intervention.zoneParams.formulaVersion}</p>
        </div>
      </aside>
    </div>
  );
}
