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
