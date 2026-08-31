import { ObjectId, type WithId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { InterventionDoc } from "@/lib/types";

export type InterventionListItem = Pick<
  InterventionDoc,
  | "name"
  | "ownerId"
  | "participantIds"
  | "status"
  | "occurredAt"
  | "location"
  | "zoneParams"
  | "createdAt"
  | "updatedAt"
> & { _id: ObjectId };

export async function interventionsCollection() {
  return getCollection<InterventionDoc>("interventions");
}

export async function findAllInterventions(): Promise<
  WithId<InterventionDoc>[]
> {
  const col = await interventionsCollection();
  return col.find({}).sort({ updatedAt: -1 }).toArray();
}

export async function findInterventionsForUser(
  userId: string,
): Promise<WithId<InterventionDoc>[]> {
  const col = await interventionsCollection();
  const oid = new ObjectId(userId);
  return col
    .find({
      $or: [{ ownerId: oid }, { participantIds: oid }],
    })
    .sort({ updatedAt: -1 })
    .toArray();
}

export async function findInterventionById(
  id: string,
): Promise<WithId<InterventionDoc> | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await interventionsCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function insertIntervention(
  doc: Omit<InterventionDoc, "_id">,
): Promise<WithId<InterventionDoc>> {
  const col = await interventionsCollection();
  const result = await col.insertOne(doc as InterventionDoc);
  return { ...doc, _id: result.insertedId };
}

export async function updateInterventionById(
  id: string,
  update: Partial<InterventionDoc>,
): Promise<WithId<InterventionDoc> | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await interventionsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result;
}

export async function deleteInterventionById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await interventionsCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function ensureInterventionIndexes() {
  const col = await interventionsCollection();
  await col.createIndexes([
    { key: { ownerId: 1 } },
    { key: { participantIds: 1 } },
    { key: { "location.point": "2dsphere" } },
  ]);
}
