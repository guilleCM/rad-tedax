import { ObjectId, type WithId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { UserDoc, UserRole } from "@/lib/types";

export async function usersCollection() {
  return getCollection<UserDoc>("users");
}

export async function findUserByEmail(
  email: string,
): Promise<WithId<UserDoc> | null> {
  const col = await usersCollection();
  return col.findOne({ email: email.toLowerCase() });
}

export async function findUserById(
  id: string,
): Promise<WithId<UserDoc> | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await usersCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function findUsersByIds(
  ids: string[],
): Promise<WithId<UserDoc>[]> {
  const objectIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objectIds.length === 0) return [];
  const col = await usersCollection();
  return col.find({ _id: { $in: objectIds } }).toArray();
}

export async function findAllUsers(): Promise<WithId<UserDoc>[]> {
  const col = await usersCollection();
  return col.find({}).sort({ createdAt: -1 }).toArray();
}

export async function findUsersByRole(
  role: UserRole,
): Promise<WithId<UserDoc>[]> {
  const col = await usersCollection();
  return col.find({ role }).sort({ createdAt: -1 }).toArray();
}

export async function insertUser(
  doc: Omit<UserDoc, "_id">,
): Promise<WithId<UserDoc>> {
  const col = await usersCollection();
  const result = await col.insertOne(doc as UserDoc);
  return { ...doc, _id: result.insertedId };
}

export async function deleteUserById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await usersCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function ensureUserIndexes() {
  const col = await usersCollection();
  await col.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: { email: { $type: "string" } },
    },
  );
}
