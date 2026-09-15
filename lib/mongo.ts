import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "scholarship";

let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

if (process.env.NODE_ENV === "development") {
  // Reuse the connection across HMR reloads in dev.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export async function getMongoDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function logAuditEvent(event: {
  applicationId: string;
  actorId: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getMongoDb();
  await db.collection("audit_events").insertOne({
    ...event,
    createdAt: new Date(),
  });
}
