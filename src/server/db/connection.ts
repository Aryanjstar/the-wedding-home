import "server-only";

import mongoose from "mongoose";

import { getDatabaseEnv } from "@/config/env";
import "@/server/db/models";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __twhMongoose?: MongooseCache;
};

function cache(): MongooseCache {
  globalForMongoose.__twhMongoose ??= { conn: null, promise: null };
  return globalForMongoose.__twhMongoose;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const cached = cache();
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const { MONGODB_URI } = getDatabaseEnv();
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
