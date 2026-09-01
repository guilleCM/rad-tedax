import { describe, expect, it } from "vitest";
import {
  formatAccumulatedDose,
  formatAccumulatedDoseMsv,
} from "./formatOperationDose";

describe("formatAccumulatedDoseMsv", () => {
  it("shows mSv with two decimals for normal values", () => {
    expect(formatAccumulatedDoseMsv(0.15)).toBe("0,15 mSv");
    expect(formatAccumulatedDoseMsv(1)).toBe("1,00 mSv");
  });

  it("shows µSv for small positive doses below 0.01 mSv", () => {
    expect(formatAccumulatedDoseMsv(0.001)).toBe("1,0 µSv");
    expect(formatAccumulatedDoseMsv(0.005)).toBe("5,0 µSv");
  });

  it("shows mSv at the threshold boundary", () => {
    expect(formatAccumulatedDoseMsv(0.01)).toBe("0,01 mSv");
  });

  it("shows zero mSv for zero dose", () => {
    expect(formatAccumulatedDoseMsv(0)).toBe("0,00 mSv");
  });
});

describe("formatAccumulatedDose", () => {
  it("formats explicit units", () => {
    expect(formatAccumulatedDose(10, "mSv")).toBe("10,00 mSv");
    expect(formatAccumulatedDose(500, "uSv")).toBe("500,00 µSv");
  });
});
