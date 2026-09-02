import { describe, expect, it } from "vitest";
import { mergeInterventionHeader } from "@/lib/interventions/mergeHeaderStatus";

const base = {
  name: "Operación Alpha",
  createdAt: "2026-01-01T10:00:00.000Z",
  readOnly: false,
};

describe("mergeInterventionHeader", () => {
  it("returns next when current is null", () => {
    expect(
      mergeInterventionHeader(null, { ...base, status: "draft" }),
    ).toEqual({ ...base, status: "draft" });
  });

  it("keeps active client status when server sends draft (stale refresh)", () => {
    expect(
      mergeInterventionHeader(
        { ...base, status: "active" },
        { ...base, status: "draft" },
      ),
    ).toEqual({ ...base, status: "active" });
  });

  it("accepts active from server when client is draft", () => {
    expect(
      mergeInterventionHeader(
        { ...base, status: "draft" },
        { ...base, status: "active" },
      ),
    ).toEqual({ ...base, status: "active" });
  });

  it("accepts closed from server", () => {
    expect(
      mergeInterventionHeader(
        { ...base, status: "active" },
        { ...base, status: "closed" },
      ),
    ).toEqual({ ...base, status: "closed" });
  });

  it("replaces entirely when intervention identity changes", () => {
    expect(
      mergeInterventionHeader(
        { ...base, status: "active" },
        {
          name: "Operación Beta",
          createdAt: "2026-02-01T10:00:00.000Z",
          status: "draft",
        },
      ),
    ).toEqual({
      name: "Operación Beta",
      createdAt: "2026-02-01T10:00:00.000Z",
      status: "draft",
    });
  });
});
