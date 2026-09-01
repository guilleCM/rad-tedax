import { describe, expect, it } from "vitest";
import { shouldActivateIntervention } from "@/domain/dosimetry/operationActivation";

describe("shouldActivateIntervention", () => {
  it("activates when status is draft", () => {
    expect(shouldActivateIntervention("draft")).toBe(true);
  });

  it("does not activate when status is active", () => {
    expect(shouldActivateIntervention("active")).toBe(false);
  });

  it("does not activate when status is closed", () => {
    expect(shouldActivateIntervention("closed")).toBe(false);
  });
});
