import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  const dbName = process.env.MONGODB_DB || "intervencion_radiologica";
  const email = (process.env.SEED_EMAIL || "manager@example.com").toLowerCase();
  const password = process.env.SEED_PASSWORD || "changeme123";
  const name = process.env.SEED_NAME || "Gestor Demo";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");

  await users.createIndex({ email: 1 }, { unique: true });

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await users.updateOne(
    { email },
    {
      $set: {
        name,
        email,
        passwordHash,
        role: "manager",
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await db.collection("interventions").createIndexes([
    { key: { ownerId: 1 } },
    { key: { participantIds: 1 } },
    { key: { "location.point": "2dsphere" } },
  ]);

  console.log(`Seed OK: ${email} / (password from SEED_PASSWORD or default)`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
