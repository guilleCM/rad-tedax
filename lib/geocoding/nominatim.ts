type NominatimResult = {
  lat: string;
  lon: string;
  country_code?: string;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function getUserAgent(): string {
  return (
    process.env.NOMINATIM_USER_AGENT ??
    "IntervencionRadiologica/1.0 (intervencion-radiologica)"
  );
}

export async function geocodeAddress(
  query: string,
): Promise<[number, number] | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    limit: "5",
    countrycodes: "es",
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": getUserAgent(),
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const results = (await res.json()) as NominatimResult[];
    if (!Array.isArray(results) || results.length === 0) return null;

    const match =
      results.find((r) => r.country_code?.toLowerCase() === "es") ?? results[0];

    const lon = Number.parseFloat(match.lon);
    const lat = Number.parseFloat(match.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

    return [lon, lat];
  } catch {
    return null;
  }
}
