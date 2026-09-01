import { MongoClient, Db, Collection, Document } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn("MONGODB_URI is not set. Database calls will fail until it is configured.");
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientOptions = {
  maxPoolSize: 10,
  maxIdleTimeMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
};

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(new Error("MONGODB_URI is not configured"));
  }
  const client = new MongoClient(uri, clientOptions);
  attachDatabasePool(client);
  return client.connect();
}

const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? (global._mongoClientPromise = createClientPromise());

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || "rad_tedax";
  return client.db(dbName);
}

export async function getCollection<T extends Document>(
  name: string,
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export { clientPromise };
