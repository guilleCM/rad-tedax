import { describe, expect, it } from "vitest";
import { formatDatetimeLocal, parseDatetimeLocal } from "@/lib/datetime-local";

describe("formatDatetimeLocal", () => {
  it("formats local date components as YYYY-MM-DDTHH:mm", () => {
    const date = new Date(2026, 8, 2, 14, 30);
    expect(formatDatetimeLocal(date)).toBe("2026-09-02T14:30");
  });
});

describe("parseDatetimeLocal", () => {
  it("returns null for invalid values", () => {
    expect(parseDatetimeLocal("invalid")).toBeNull();
  });

  it("round-trips with formatDatetimeLocal", () => {
    const original = new Date(2026, 8, 2, 14, 30);
    const parsed = parseDatetimeLocal(formatDatetimeLocal(original));
    expect(parsed).not.toBeNull();
    expect(parsed!.getTime()).toBe(original.getTime());
  });
});
