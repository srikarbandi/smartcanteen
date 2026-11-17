// ============================================================================
// SmartCanteen — MongoDB initialization (Soha Rafiq's NoSQL layer).
//
// Creates the two collections, applies indexes with a JSON-schema validator,
// seeds a couple of demo documents, and runs the feedback-analytics
// aggregation pipeline to prove it works.
//
//   Collections:
//     order_activity_logs — append-only event log per order
//     feedback            — student ratings + comments per order/canteen
//
// Run:  npm run mongo:setup     (reads MONGODB_URI / MONGODB_DB from env)
// ============================================================================
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Minimal .env.local loader (avoids a hard dotenv dependency at runtime).
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* no .env.local — rely on real env */ }
}
loadEnv();

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "smartcanteen";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected to MongoDB ${uri} / db ${dbName}`);

  // -- order_activity_logs ---------------------------------------------------
  await db.command({
    collMod: "order_activity_logs",
    validator: {},
  }).catch(async () => {
    await db.createCollection("order_activity_logs", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["order_id", "event_type", "timestamp"],
          properties: {
            order_id:        { bsonType: ["int", "long", "double"] },
            student_id:      { bsonType: ["int", "long", "double", "null"] },
            event_type:      { bsonType: "string" },
            previous_status: { bsonType: ["string", "null"] },
            new_status:      { bsonType: ["string", "null"] },
            timestamp:       { bsonType: "date" },
            description:     { bsonType: ["string", "null"] },
          },
        },
      },
    });
    console.log("Created collection order_activity_logs");
  });

  // -- feedback --------------------------------------------------------------
  await db.command({ collMod: "feedback", validator: {} }).catch(async () => {
    await db.createCollection("feedback", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["student_id", "canteen_id", "rating", "timestamp"],
          properties: {
            student_id: { bsonType: ["int", "long", "double"] },
            order_id:   { bsonType: ["int", "long", "double", "null"] },
            canteen_id: { bsonType: ["int", "long", "double"] },
            rating:     { bsonType: ["int", "double"], minimum: 1, maximum: 5 },
            comment:    { bsonType: ["string", "null"] },
            timestamp:  { bsonType: "date" },
          },
        },
      },
    });
    console.log("Created collection feedback");
  });

  // -- Indexes ---------------------------------------------------------------
  await db.collection("order_activity_logs").createIndexes([
    { key: { order_id: 1, timestamp: -1 }, name: "order_time" },
    { key: { event_type: 1 }, name: "event_type" },
    { key: { student_id: 1 }, name: "student" },
  ]);
  await db.collection("feedback").createIndexes([
    { key: { canteen_id: 1, timestamp: -1 }, name: "canteen_time" },
    { key: { order_id: 1 }, name: "order" },
    { key: { student_id: 1 }, name: "student" },
  ]);
  console.log("Indexes ensured");

  // -- Demo documents (idempotent-ish: only seed when empty) -----------------
  if ((await db.collection("feedback").countDocuments()) === 0) {
    await db.collection("feedback").insertMany([
      { student_id: 3, order_id: null, canteen_id: 1, rating: 5, comment: "Hot and fresh dosa!", timestamp: new Date() },
      { student_id: 4, order_id: null, canteen_id: 1, rating: 4, comment: "Quick pickup.", timestamp: new Date() },
      { student_id: 5, order_id: null, canteen_id: 2, rating: 3, comment: "Roll was a bit cold.", timestamp: new Date() },
      { student_id: 3, order_id: null, canteen_id: 2, rating: 4, comment: "Good portion.", timestamp: new Date() },
    ]);
    console.log("Seeded demo feedback");
  }

  // -- Feedback analytics aggregation (the required pipeline) ----------------
  const analytics = await db.collection("feedback").aggregate([
    {
      $group: {
        _id: "$canteen_id",
        averageRating: { $avg: "$rating" },
        feedbackCount: { $sum: 1 },
        latest: { $max: "$timestamp" },
      },
    },
    { $project: { _id: 0, canteen_id: "$_id", averageRating: { $round: ["$averageRating", 2] }, feedbackCount: 1, latest: 1 } },
    { $sort: { averageRating: -1 } },
  ]).toArray();

  console.log("\nCanteen feedback analytics (avg rating + count):");
  console.table(analytics);

  await client.close();
  console.log("\nMongoDB initialization complete.");
}

main().catch((err) => {
  console.error("Mongo init failed:", err);
  process.exit(1);
});
