import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mongoMocks = vi.hoisted(() => {
  const collection = {};
  const db = {
    collection: vi.fn(() => collection),
  };
  const client = {
    connect: vi.fn(),
    close: vi.fn(),
    db: vi.fn(() => db),
  };

  return {
    attachDatabasePool: vi.fn(),
    client,
    collection,
    constructor: vi.fn(),
    db,
  };
});

vi.mock("mongodb", () => ({
  MongoClient: class {
    constructor(...args: unknown[]) {
      mongoMocks.constructor(...args);
      return mongoMocks.client;
    }
  },
}));

vi.mock("@vercel/functions", () => ({
  attachDatabasePool: mongoMocks.attachDatabasePool,
}));

function connectionError(message = "server selection timed out"): Error {
  const error = new Error(message);
  error.name = "MongoServerSelectionError";
  return error;
}

async function importDb() {
  return import("@/lib/db");
}

describe("MongoDB connection lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    process.env.MONGODB_URI = "mongodb://example.test:27017";
    process.env.MONGODB_DB = "test_db";
    delete global._mongoClientPromise;

    mongoMocks.constructor.mockClear();
    mongoMocks.attachDatabasePool.mockClear();
    mongoMocks.client.connect.mockReset().mockResolvedValue(mongoMocks.client);
    mongoMocks.client.close.mockReset().mockResolvedValue(undefined);
    mongoMocks.client.db.mockClear();
    mongoMocks.db.collection.mockClear();

    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete global._mongoClientPromise;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("does not connect until the database is requested", async () => {
    const { getDb } = await importDb();

    expect(mongoMocks.constructor).not.toHaveBeenCalled();

    await getDb();

    expect(mongoMocks.constructor).toHaveBeenCalledWith(
      process.env.MONGODB_URI,
      expect.objectContaining({
        maxIdleTimeMS: 30_000,
        serverSelectionTimeoutMS: 20_000,
      }),
    );
    expect(mongoMocks.attachDatabasePool).toHaveBeenCalledWith(
      mongoMocks.client,
    );
  });

  it("reuses one connection for concurrent requests", async () => {
    const { getDb } = await importDb();

    const [firstDb, secondDb] = await Promise.all([getDb(), getDb()]);

    expect(firstDb).toBe(mongoMocks.db);
    expect(secondDb).toBe(mongoMocks.db);
    expect(mongoMocks.constructor).toHaveBeenCalledTimes(1);
    expect(mongoMocks.client.connect).toHaveBeenCalledTimes(1);
  });

  it("retries a transient initial connection failure", async () => {
    vi.useFakeTimers();
    mongoMocks.client.connect
      .mockRejectedValueOnce(connectionError())
      .mockResolvedValueOnce(mongoMocks.client);
    const { getDb } = await importDb();

    const result = getDb();
    await vi.advanceTimersByTimeAsync(250);

    await expect(result).resolves.toBe(mongoMocks.db);
    expect(mongoMocks.constructor).toHaveBeenCalledTimes(2);
    expect(mongoMocks.client.close).toHaveBeenCalledTimes(1);
    expect(mongoMocks.client.connect).toHaveBeenCalledTimes(2);
  });

  it("clears a definitively failed connection so the next request can recover", async () => {
    vi.useFakeTimers();
    mongoMocks.client.connect
      .mockRejectedValueOnce(connectionError("first failure"))
      .mockRejectedValueOnce(connectionError("second failure"));
    const { getDb } = await importDb();

    const failedRequest = expect(getDb()).rejects.toMatchObject({
      name: "MongoServerSelectionError",
      message: "second failure",
    });
    await vi.advanceTimersByTimeAsync(250);
    await failedRequest;

    mongoMocks.client.connect.mockResolvedValueOnce(mongoMocks.client);
    await expect(getDb()).resolves.toBe(mongoMocks.db);

    expect(mongoMocks.constructor).toHaveBeenCalledTimes(3);
    expect(mongoMocks.client.connect).toHaveBeenCalledTimes(3);
  });
});
