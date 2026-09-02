import {
  MongoClient,
  type Collection,
  type Db,
  type Document,
} from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const uri = process.env.MONGODB_URI;
const MAX_CONNECTION_ATTEMPTS = 2;
const CONNECTION_RETRY_DELAY_MS = 250;

if (!uri) {
  console.warn("MONGODB_URI is not set. Database calls will fail until it is configured.");
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientOptions = {
  maxPoolSize: 10,
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 20_000,
};

function isRetryableConnectionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    [
      "MongoNetworkError",
      "MongoServerSelectionError",
      "MongoTimeoutError",
    ].includes(error.name)
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    const client = new MongoClient(uri, clientOptions);
    attachDatabasePool(client);

    try {
      const connectedClient = await client.connect();
      console.info(
        `[mongodb] connected in ${Date.now() - startedAt}ms (attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS})`,
      );
      return connectedClient;
    } catch (error) {
      await client.close().catch(() => undefined);

      if (
        attempt === MAX_CONNECTION_ATTEMPTS ||
        !isRetryableConnectionError(error)
      ) {
        throw error;
      }

      console.warn(
        `[mongodb] connection attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS} failed; retrying in ${CONNECTION_RETRY_DELAY_MS}ms`,
      );
      await wait(CONNECTION_RETRY_DELAY_MS);
    }
  }

  throw new Error("MongoDB connection attempts exhausted");
}

function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const connectionPromise = connectClient();
    global._mongoClientPromise = connectionPromise;

    // Handle and clear failed connections so a warm instance can recover.
    void connectionPromise.catch(() => {
      if (global._mongoClientPromise === connectionPromise) {
        global._mongoClientPromise = undefined;
      }
    });
  }

  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB || "rad_tedax";
  return client.db(dbName);
}

export async function getCollection<T extends Document>(
  name: string,
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}
