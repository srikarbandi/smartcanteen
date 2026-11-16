// MongoDB client (official driver). Shared, lazily-created connection.
// Used for order_activity_logs (event log) and feedback (ratings + analytics).
import { MongoClient, type Db, type Collection } from "mongodb";

let clientPromise: Promise<MongoClient> | null = null;

function getClient(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  clientPromise = new MongoClient(uri, { maxPoolSize: 10 }).connect();
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "smartcanteen");
}

// ---- Typed document shapes -------------------------------------------------
export interface ActivityLog {
  order_id: number;
  student_id: number | null;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  timestamp: Date;
  description: string | null;
}

export interface Feedback {
  student_id: number;
  order_id: number | null;
  canteen_id: number;
  rating: number;
  comment: string | null;
  timestamp: Date;
}

export async function activityLogs(): Promise<Collection<ActivityLog>> {
  return (await getDb()).collection<ActivityLog>("order_activity_logs");
}

export async function feedbackCol(): Promise<Collection<Feedback>> {
  return (await getDb()).collection<Feedback>("feedback");
}

/**
 * Append an order activity event. Best-effort: logging failures must never
 * break the authoritative MySQL transaction, so callers wrap this in try/catch.
 */
export async function logActivity(entry: Omit<ActivityLog, "timestamp"> & { timestamp?: Date }) {
  const col = await activityLogs();
  await col.insertOne({ timestamp: new Date(), ...entry } as ActivityLog);
}
