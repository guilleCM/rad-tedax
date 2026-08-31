import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  const dbName = process.env.MONGODB_DB || "intervencion_radiologica";
  const email = (process.env.SEED_EMAIL || "manager@example.com").toLowerCase();
  const password = process.env.SEED_PASSWORD || "changeme123";
  const name = process.env.SEED_NAME || "Gestor Demo";
  const leaderEmail = (
    process.env.SEED_LEADER_EMAIL || "leader@example.com"
  ).toLowerCase();
  const leaderPassword = process.env.SEED_LEADER_PASSWORD || password;
  const leaderName = process.env.SEED_LEADER_NAME || "Líder Demo";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");

  await users.createIndex({ email: 1 }, { unique: true, sparse: true });

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const managerResult = await users.findOneAndUpdate(
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
        createdById: new ObjectId(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  const managerId = managerResult?._id;
  if (managerId) {
    await users.updateOne(
      { _id: managerId },
      { $set: { createdById: managerId } },
    );

    await users.updateMany(
      {
        $or: [{ createdById: { $exists: false } }, { createdById: null }],
      },
      { $set: { createdById: managerId } },
    );
  }

  const leaderPasswordHash = await bcrypt.hash(leaderPassword, 12);
  await users.updateOne(
    { email: leaderEmail },
    {
      $set: {
        name: leaderName,
        email: leaderEmail,
        passwordHash: leaderPasswordHash,
        role: "leader",
        createdById: managerId ?? new ObjectId(),
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
  console.log(
    `Seed OK: ${leaderEmail} / (password from SEED_LEADER_PASSWORD or SEED_PASSWORD)`,
  );
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
