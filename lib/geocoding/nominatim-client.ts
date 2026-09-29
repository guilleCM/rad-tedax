export type NominatimSearchHit = {
  lat: string;
  lon: string;
  display_name: string;
  boundingbox?: [string, string, string, string];
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function searchNominatim(
  query: string,
  signal?: AbortSignal,
): Promise<NominatimSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    limit: "5",
    countrycodes: "es",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    throw new Error("No se pudo buscar la dirección");
  }

  const results = (await res.json()) as NominatimSearchHit[];
  if (!Array.isArray(results)) return [];

  return results.filter(
    (r) =>
      typeof r.display_name === "string" &&
      Number.isFinite(Number.parseFloat(r.lon)) &&
      Number.isFinite(Number.parseFloat(r.lat)),
  );
}

type NominatimAddress = {
  road?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
};

type NominatimReverseResult = {
  display_name?: string;
  address?: NominatimAddress;
};

export function formatReversePlaceLabel(
  result: NominatimReverseResult,
): string | null {
  const address = result.address;
  if (address) {
    const road = [address.road, address.house_number].filter(Boolean).join(" ");
    const place =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.city_district;
    const line = [road, place].filter(Boolean).join(", ");
    if (line) return line.slice(0, 200);
  }

  const displayName = result.display_name?.trim();
  if (!displayName) return null;
  return displayName.slice(0, 200);
}

export async function reverseGeocodeNominatim(
  longitude: number,
  latitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    format: "json",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
    addressdetails: "1",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );

  if (!res.ok) return null;

  const result = (await res.json()) as NominatimReverseResult;
  return formatReversePlaceLabel(result);
}
