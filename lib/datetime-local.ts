function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats a Date for HTML `datetime-local` inputs (local time, no timezone). */
export function formatDatetimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Parses a `datetime-local` value as local time. Returns null if invalid. */
export function parseDatetimeLocal(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
