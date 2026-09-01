import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import {
  allowedRolesForCreator,
  canCreateAccountUser,
  canCreateParticipantRegistry,
  canDeleteUser,
  canListUsers,
} from "@/lib/services/permissions";
import { AppError } from "@/lib/services/interventions";
import {
  deleteUserById,
  findAllUsers,
  findUserByEmail,
  findUserById,
  findUsersByIds,
  findUsersByRole,
  insertUser,
} from "@/lib/repositories/users";
import type { UserDoc, UserRole } from "@/lib/types";
import type {
  CreateParticipantRegistryInput,
  CreateUserInput,
} from "@/lib/validations/user";

const SYSTEM_CREATOR = { id: "", name: "Sistema" } as const;

function getCreatedByIdString(
  doc: UserDoc & { _id: ObjectId },
): string | null {
  if (!doc.createdById) return null;
  return doc.createdById.toString();
}

function resolveCreatedBy(
  doc: UserDoc & { _id: ObjectId },
  creatorMap: Map<string, { id: string; name: string }>,
) {
  const creatorId = getCreatedByIdString(doc);
  if (!creatorId) return SYSTEM_CREATOR;
  const creator = creatorMap.get(creatorId);
  return creator ?? { id: creatorId, name: "—" };
}

function serializeUserBase(doc: UserDoc & { _id: ObjectId }) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email ?? null,
    role: doc.role,
    createdAt: doc.createdAt?.toISOString() ?? new Date(0).toISOString(),
    createdById: getCreatedByIdString(doc),
  };
}

function serializeUserWithCreator(
  doc: UserDoc & { _id: ObjectId },
  creatorMap: Map<string, { id: string; name: string }>,
) {
  return {
    ...serializeUserBase(doc),
    createdBy: resolveCreatedBy(doc, creatorMap),
  };
}

export async function getInterventionParticipants(participantIds: string[]) {
  if (participantIds.length === 0) return [];

  const docs = await findUsersByIds(participantIds);
  const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]));

  return participantIds
    .map((id) => byId.get(id))
    .filter((doc): doc is NonNullable<typeof doc> => doc !== undefined)
    .map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      role: doc.role,
    }));
}

export async function listUsers(actorRole: UserRole, actorId: string) {
  if (!canListUsers(actorRole)) {
    throw new AppError("FORBIDDEN", "No tienes acceso a usuarios", 403);
  }

  const docs =
    actorRole === "manager"
      ? await findAllUsers()
      : await findUsersByRole("participant");

  const creatorIds = [
    ...new Set(
      docs
        .map((doc) => getCreatedByIdString(doc))
        .filter((id): id is string => id !== null),
    ),
  ];
  const creators = await findUsersByIds(creatorIds);
  const creatorMap = new Map(
    creators.map((c) => [c._id.toString(), { id: c._id.toString(), name: c.name }]),
  );

  return docs.map((doc) => serializeUserWithCreator(doc, creatorMap));
}

export async function createParticipantRegistry(
  actorRole: UserRole,
  actorId: string,
  input: CreateParticipantRegistryInput,
) {
  if (!canCreateParticipantRegistry(actorRole)) {
    throw new AppError(
      "FORBIDDEN",
      "No tienes permiso para crear intervinientes",
      403,
    );
  }

  const now = new Date();
  const doc = await insertUser({
    name: input.name.trim(),
    email: null,
    passwordHash: null,
    role: "participant",
    createdById: new ObjectId(actorId),
    createdAt: now,
    updatedAt: now,
  });

  const creator = await findUserById(actorId);
  const creatorMap = new Map<string, { id: string; name: string }>();
  if (creator) {
    creatorMap.set(creator._id.toString(), {
      id: creator._id.toString(),
      name: creator.name,
    });
  }

  return serializeUserWithCreator(doc, creatorMap);
}

export async function createUser(
  actorRole: UserRole,
  actorId: string,
  input: CreateUserInput,
) {
  if (!canCreateAccountUser(actorRole)) {
    throw new AppError(
      "FORBIDDEN",
      "No tienes permiso para crear usuarios",
      403,
    );
  }

  const allowed = allowedRolesForCreator(actorRole);
  let role: UserRole;

  if (actorRole === "leader") {
    role = "participant";
  } else {
    if (!input.role) {
      throw new AppError("VALIDATION", "El rol es obligatorio", 400);
    }
    if (!allowed.includes(input.role)) {
      throw new AppError("FORBIDDEN", "No puedes asignar ese rol", 403);
    }
    role = input.role;
  }

  const email = input.email.toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError("CONFLICT", "Ya existe un usuario con ese email", 409);
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(input.password, 12);

  const doc = await insertUser({
    name: input.name.trim(),
    email,
    passwordHash,
    role,
    createdById: new ObjectId(actorId),
    createdAt: now,
    updatedAt: now,
  });

  const creator = await findUserById(actorId);
  const creatorMap = new Map<string, { id: string; name: string }>();
  if (creator) {
    creatorMap.set(creator._id.toString(), {
      id: creator._id.toString(),
      name: creator.name,
    });
  }

  return serializeUserWithCreator(doc, creatorMap);
}

export async function removeUser(
  actorRole: UserRole,
  actorId: string,
  targetId: string,
) {
  const target = await findUserById(targetId);
  if (!target) {
    throw new AppError("NOT_FOUND", "Usuario no encontrado", 404);
  }

  if (!canDeleteUser(actorRole, target, actorId)) {
    throw new AppError("FORBIDDEN", "No puedes eliminar este usuario", 403);
  }

  const ok = await deleteUserById(targetId);
  if (!ok) {
    throw new AppError("NOT_FOUND", "Usuario no encontrado", 404);
  }

  return { ok: true };
}
