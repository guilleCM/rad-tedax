import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  canAccessIntervention,
  isOwner,
} from "@/lib/services/intervention-access";
import type { InterventionDoc } from "@/lib/types";

function makeIntervention(
  ownerId: ObjectId,
  participantIds: ObjectId[] = [],
): InterventionDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    name: "Test",
    ownerId,
    participantIds,
    status: "draft",
    occurredAt: now,
    zoneParams: {
      formulaVersion: "v1-placeholder",
      radiusZoneIMeters: 100,
      radiusZoneIIMeters: 300,
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe("intervention authorization", () => {
  it("allows the owner", () => {
    const ownerId = new ObjectId();
    const doc = makeIntervention(ownerId);
    expect(isOwner(doc, ownerId.toString())).toBe(true);
    expect(canAccessIntervention(doc, ownerId.toString())).toBe(true);
  });

  it("allows participants and denies strangers", () => {
    const ownerId = new ObjectId();
    const participantId = new ObjectId();
    const strangerId = new ObjectId();
    const doc = makeIntervention(ownerId, [participantId]);

    expect(canAccessIntervention(doc, participantId.toString())).toBe(true);
    expect(canAccessIntervention(doc, strangerId.toString())).toBe(false);
    expect(isOwner(doc, participantId.toString())).toBe(false);
  });
});
