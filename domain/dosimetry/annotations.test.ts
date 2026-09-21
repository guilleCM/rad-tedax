import { describe, expect, it } from "vitest";
import { resolveAnnotations } from "./annotations";

describe("resolveAnnotations", () => {
  it("returns stored annotations in chronological order", () => {
    expect(
      resolveAnnotations({
        annotations: [
          { text: " Segundo ", createdAt: "2026-09-21T20:30:00.000Z" },
          { text: "Primero", createdAt: "2026-09-21T20:14:00.000Z" },
        ],
      }),
    ).toEqual([
      { text: "Primero", createdAt: "2026-09-21T20:14:00.000Z" },
      { text: "Segundo", createdAt: "2026-09-21T20:30:00.000Z" },
    ]);
  });

  it("keeps a legacy free-text note when there is no list", () => {
    expect(resolveAnnotations({ notes: "  Revisión completada  " })).toEqual([
      { text: "Revisión completada", createdAt: null },
    ]);
  });

  it("returns nothing when there are no notes", () => {
    expect(resolveAnnotations({ notes: "   " })).toEqual([]);
  });
});
