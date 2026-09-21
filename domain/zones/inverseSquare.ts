export const INITIAL_CORDON_INNER_METERS = 50;
export const INITIAL_CORDON_OUTER_METERS = 100;

/** Zona I: 5 mSv/h. Zona II: 100 µSv/h. */
export const ZONE_I_DOSE_RATE_MSV_PER_HOUR = 5;
export const ZONE_II_DOSE_RATE_MSV_PER_HOUR = 0.1;

export const INVERSE_SQUARE_FORMULA = "v2-inverse-square";

const EARTH_RADIUS_METERS = 6_371_000;

export type ZoningPhase = "initial-cordon" | "measured";

export type ZoneRadii = {
  radiusZoneIMeters: number;
  radiusZoneIIMeters: number;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distancia geodésica aproximada entre dos puntos [lng, lat]. */
export function distanceMeters(
  from: [number, number],
  to: [number, number],
): number {
  const dLat = toRadians(to[1] - from[1]);
  const dLng = toRadians(to[0] - from[0]);
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Radio de 5 mSv/h a partir del radio medido a 100 µSv/h.
 * Supone fuente puntual y sin blindaje: la tasa cae con el cuadrado de la distancia.
 */
export function radiiFromAlertReading(outerRadiusMeters: number): ZoneRadii | null {
  if (!(outerRadiusMeters >= 1)) return null;

  const radiusZoneIIMeters = Math.round(outerRadiusMeters);
  const ratio = Math.sqrt(
    ZONE_I_DOSE_RATE_MSV_PER_HOUR / ZONE_II_DOSE_RATE_MSV_PER_HOUR,
  );
  const radiusZoneIMeters = Math.max(1, Math.round(radiusZoneIIMeters / ratio));

  if (radiusZoneIMeters > radiusZoneIIMeters) return null;

  return { radiusZoneIMeters, radiusZoneIIMeters };
}

export function beltCopy(
  phase: ZoningPhase,
  zoneIEstimated: boolean,
): {
  innerTitle: string;
  outerTitle: string;
  innerNote: string | null;
  outerNote: string | null;
} {
  if (phase === "initial-cordon") {
    return {
      innerTitle: "Cinturón interior",
      outerTitle: "Cinturón exterior",
      innerNote: "Perímetro de espera, sin medición",
      outerNote: "Perímetro de espera, sin medición",
    };
  }

  return {
    innerTitle: "Zona I - Medidas Urgentes",
    outerTitle: "Zona II - Alerta",
    innerNote: zoneIEstimated
      ? "Estimado · fuente puntual, sin blindaje"
      : null,
    outerNote: zoneIEstimated ? "Medido a 100 µSv/h" : null,
  };
}
