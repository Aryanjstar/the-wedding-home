import mongoose from "mongoose";

import { registeredModels } from "../src/server/db/models";

async function main() {
  if (registeredModels.length === 0) {
    console.log("No models registered yet. Indexes are created when a slice adds a model.");
    return;
  }

  const { connectToDatabase } = await import("../src/server/db/connection");
  await connectToDatabase();

  try {
    for (const model of registeredModels) {
      await model.syncIndexes();
      console.log(`Synced indexes for ${model.collection.collectionName}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Index sync failed.";
  console.error(message);
  process.exit(1);
});
