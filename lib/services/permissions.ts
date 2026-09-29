import type { InterventionDoc, UserDoc, UserRole } from "@/lib/types";

export function canCreateUser(role: UserRole): boolean {
  return role === "manager" || role === "leader";
}

export function canAccessUserAdmin(role: UserRole): boolean {
  return canCreateUser(role);
}

export function canCreateParticipantRegistry(role: UserRole): boolean {
  return canCreateUser(role);
}

export function canListUsers(role: UserRole): boolean {
  return canCreateUser(role);
}

export function canCreateAccountUser(role: UserRole): boolean {
  return canCreateUser(role);
}

export function canDeleteUser(
  actorRole: UserRole,
  target: UserDoc,
  actorId: string,
): boolean {
  return canDeleteUserByRole(
    actorRole,
    target.role,
    target._id.toString(),
    actorId,
  );
}

export function canDeleteUserByRole(
  actorRole: UserRole,
  targetRole: UserRole,
  targetId: string,
  actorId: string,
): boolean {
  if (targetId === actorId) return false;
  if (actorRole === "manager") return true;
  if (actorRole === "leader") return targetRole === "participant";
  return false;
}

export function allowedRolesForCreator(role: UserRole): UserRole[] {
  if (role === "manager") return ["manager", "leader", "participant"];
  if (role === "leader") return ["participant"];
  return [];
}

export function canListInterventions(role: UserRole): boolean {
  return role === "manager" || role === "leader";
}

export function canReadIntervention(role: UserRole): boolean {
  return role === "manager" || role === "leader";
}

export function canCreateIntervention(role: UserRole): boolean {
  return role === "manager" || role === "leader";
}

export function canUpdateIntervention(
  role: UserRole,
  doc: InterventionDoc,
  userId: string,
): boolean {
  return canUpdateInterventionByOwner(role, doc.ownerId.toString(), userId);
}

export function canUpdateInterventionByOwner(
  role: UserRole,
  ownerId: string,
  userId: string,
): boolean {
  if (role === "manager") return true;
  if (role === "leader") return ownerId === userId;
  return false;
}

export function canDeleteIntervention(role: UserRole): boolean {
  return role === "manager";
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "manager":
      return "Administrador";
    case "leader":
      return "Jefe de grupo";
    case "participant":
      return "Interviniente";
  }
}
