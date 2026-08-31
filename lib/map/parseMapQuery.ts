function parseDecimal(value: string): number {
  const trimmed = value.trim();
  if (!/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) return Number.NaN;
  return Number.parseFloat(trimmed.replace(",", "."));
}

/**
 * Parses independent lat/lng strings.
 * Returns MapLibre [lng, lat], or null if either value is missing or out of range.
 */
export function parseLatLng(
  latText: string,
  lngText: string,
): [number, number] | null {
  const lat = parseDecimal(latText);
  const lng = parseDecimal(lngText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}
