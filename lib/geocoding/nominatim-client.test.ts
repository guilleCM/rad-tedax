import { describe, expect, it } from "vitest";
import { formatReversePlaceLabel } from "@/lib/geocoding/nominatim-client";

describe("formatReversePlaceLabel", () => {
  it("uses the street and the city", () => {
    expect(
      formatReversePlaceLabel({
        address: {
          road: "Calle de Alcalá",
          house_number: "1",
          city: "Madrid",
        },
        display_name: "una dirección muy larga",
      }),
    ).toBe("Calle de Alcalá 1, Madrid");
  });

  it("falls back to the full name", () => {
    expect(
      formatReversePlaceLabel({
        display_name: "Plaza Mayor, Madrid, España",
      }),
    ).toBe("Plaza Mayor, Madrid, España");
  });
});
