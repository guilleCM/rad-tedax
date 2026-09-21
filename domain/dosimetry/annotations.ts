export type AnnotationSource = {
  text: string;
  createdAt?: string | Date | null;
};

export type AnnotationRecord = {
  text: string;
  createdAt: string | null;
};

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function resolveAnnotations(
  overrides?: {
    notes?: string | null;
    annotations?: AnnotationSource[] | null;
  } | null,
): AnnotationRecord[] {
  const stored = (overrides?.annotations ?? [])
    .map((annotation) => ({
      text: annotation.text.trim(),
      createdAt: toIso(annotation.createdAt),
    }))
    .filter((annotation) => annotation.text.length > 0)
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  if (stored.length > 0) return stored;

  const legacy = overrides?.notes?.trim();
  if (!legacy) return [];
  return [{ text: legacy, createdAt: null }];
}

export function formatAnnotationTime(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
