import mongoose, { type Model } from "mongoose";

mongoose.set("strictQuery", true);
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

/**
 * Slice modules push their Mongoose models here.
 * `npm run db:indexes` syncs this list. Indexes are not built on connect.
 */
export const registeredModels: Model<unknown>[] = [];
