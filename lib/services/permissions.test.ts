import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  allowedRolesForCreator,
  canAccessUserAdmin,
  canCreateIntervention,
  canCreateParticipantRegistry,
  canCreateUser,
  canDeleteIntervention,
  canDeleteUser,
  canListInterventions,
  canListUsers,
  canReadIntervention,
  canUpdateIntervention,
  canUpdateInterventionByOwner,
  roleLabel,
} from "@/lib/services/permissions";
import type { InterventionDoc, UserDoc } from "@/lib/types";

function makeIntervention(ownerId: ObjectId): InterventionDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    name: "Test",
    ownerId,
    participantIds: [],
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

function makeUser(role: UserDoc["role"], id = new ObjectId()): UserDoc {
  const now = new Date();
  return {
    _id: id,
    name: "Test User",
    email: role === "participant" ? null : "test@example.com",
    passwordHash: role === "participant" ? null : "hash",
    role,
    createdById: new ObjectId(),
    createdAt: now,
    updatedAt: now,
  };
}

describe("permissions", () => {
  describe("user admin", () => {
    it("labels participant as Interviniente", () => {
      expect(roleLabel("participant")).toBe("Interviniente");
    });

    it("allows manager and leader to access user admin", () => {
      expect(canAccessUserAdmin("manager")).toBe(true);
      expect(canAccessUserAdmin("leader")).toBe(true);
      expect(canListUsers("participant")).toBe(false);
      expect(canCreateParticipantRegistry("manager")).toBe(true);
    });

    it("controls delete by role", () => {
      const managerId = new ObjectId();
      const leaderId = new ObjectId();
      const participant = makeUser("participant");
      const manager = makeUser("manager", managerId);

      expect(canDeleteUser("manager", participant, managerId.toString())).toBe(
        true,
      );
      expect(canDeleteUser("manager", manager, managerId.toString())).toBe(
        false,
      );
      expect(canDeleteUser("leader", participant, leaderId.toString())).toBe(
        true,
      );
      expect(canDeleteUser("leader", manager, leaderId.toString())).toBe(false);
    });
  });

  describe("user creation", () => {
    it("allows manager and leader to create users", () => {
      expect(canCreateUser("manager")).toBe(true);
      expect(canCreateUser("leader")).toBe(true);
      expect(canCreateUser("participant")).toBe(false);
    });

    it("restricts assignable roles by creator", () => {
      expect(allowedRolesForCreator("manager")).toEqual([
        "manager",
        "leader",
        "participant",
      ]);
      expect(allowedRolesForCreator("leader")).toEqual(["participant"]);
      expect(allowedRolesForCreator("participant")).toEqual([]);
    });
  });

  describe("interventions", () => {
    const ownerId = new ObjectId();
    const otherId = new ObjectId();
    const doc = makeIntervention(ownerId);

    it("allows manager and leader to list and read", () => {
      expect(canListInterventions("manager")).toBe(true);
      expect(canListInterventions("leader")).toBe(true);
      expect(canListInterventions("participant")).toBe(false);
      expect(canReadIntervention("manager")).toBe(true);
      expect(canReadIntervention("leader")).toBe(true);
    });

    it("allows manager and leader to create", () => {
      expect(canCreateIntervention("manager")).toBe(true);
      expect(canCreateIntervention("leader")).toBe(true);
      expect(canCreateIntervention("participant")).toBe(false);
    });

    it("allows manager to update any and leader only own", () => {
      expect(canUpdateIntervention("manager", doc, otherId.toString())).toBe(
        true,
      );
      expect(canUpdateIntervention("leader", doc, ownerId.toString())).toBe(
        true,
      );
      expect(canUpdateIntervention("leader", doc, otherId.toString())).toBe(
        false,
      );
      expect(
        canUpdateInterventionByOwner("leader", ownerId.toString(), ownerId.toString()),
      ).toBe(true);
      expect(
        canUpdateInterventionByOwner("leader", ownerId.toString(), otherId.toString()),
      ).toBe(false);
    });

    it("allows only manager to delete", () => {
      expect(canDeleteIntervention("manager")).toBe(true);
      expect(canDeleteIntervention("leader")).toBe(false);
      expect(canDeleteIntervention("participant")).toBe(false);
    });
  });
});
