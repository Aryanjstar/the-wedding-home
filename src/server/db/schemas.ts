// Schema definitions stay plain objects. Mongoose's generic constructor exhausts the typechecker.
import mongoose, { type Model, Schema } from "mongoose";

import type {
  EventDoc,
  ExpenseDoc,
  GalleryDoc,
  HouseholdDoc,
  InvitationDoc,
  MembershipDoc,
  PasswordResetDoc,
  RateLimitDoc,
  RsvpDoc,
  SessionDoc,
  TaskDoc,
  UserDoc,
  VendorDoc,
  WeddingDoc,
} from "@/server/db/documents";

const options = { timestamps: true, versionKey: false } as const;

type IndexedSchema = { index: (fields: object, options?: object) => void };

const mongooseApi = mongoose as unknown as {
  models: Record<string, Model<unknown> | undefined>;
  model: (name: string, schema: IndexedSchema, collection: string) => Model<unknown>;
  Schema: new (definition: object, options?: object) => IndexedSchema;
};

function plainSchema(definition: object, schemaOptions: object = options): IndexedSchema {
  return new mongooseApi.Schema(definition, schemaOptions);
}

function model<T>(name: string, collection: string, schema: IndexedSchema): Model<T> {
  const existing = mongooseApi.models[name] as Model<T> | undefined;
  return existing ?? (mongooseApi.model(name, schema, collection) as Model<T>);
}

const userSchema = plainSchema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    passwordChangedAt: Date,
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
userSchema.index({ email: 1 }, { unique: true });

const sessionSchema = plainSchema(
  {
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1 });

const passwordResetSchema = plainSchema(
  {
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
passwordResetSchema.index({ tokenHash: 1 }, { unique: true });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetSchema.index({ userId: 1 });

const weddingSchema = plainSchema(
  {
    brideName: { type: String, required: true },
    groomName: { type: String, required: true },
    title: String,
    weddingDate: { type: String, required: true },
    city: { type: String, required: true },
    story: String,
    adminCount: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    site: {
      slug: String,
      published: { type: Boolean, default: false },
      publishedAt: Date,
      theme: { packId: { type: String, default: "classical" } },
    },
    gallery: {
      token: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      guestUploadEnabled: { type: Boolean, default: true },
    },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
weddingSchema.index(
  { "site.slug": 1 },
  { unique: true, partialFilterExpression: { "site.slug": { $type: "string" } } },
);
weddingSchema.index({ "gallery.token": 1 }, { unique: true });

const membershipSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ["admin", "manager"] },
    joinedVia: { type: String, required: true, enum: ["creator", "invitation"] },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
membershipSchema.index({ userId: 1 }, { unique: true });
membershipSchema.index({ weddingId: 1, role: 1 });

const invitationSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true, enum: ["admin", "manager"] },
    tokenHash: { type: String, required: true },
    status: { type: String, required: true, enum: ["pending", "accepted", "revoked"] },
    invitedBy: { type: Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
    acceptedBy: Schema.Types.ObjectId,
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
invitationSchema.index({ tokenHash: 1 }, { unique: true });
invitationSchema.index(
  { weddingId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);
invitationSchema.index({ weddingId: 1, status: 1 });

const pointSchema = plainSchema(
  { type: { type: String, enum: ["Point"] }, coordinates: { type: [Number] } },
  { _id: false },
);

const eventSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    kind: {
      type: String,
      required: true,
      enum: ["roka", "engagement", "mehendi", "haldi", "sangeet", "cocktail", "wedding", "reception", "custom"],
    },
    title: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: Date,
    isPrimary: { type: Boolean, required: true, default: false },
    muhuratAt: Date,
    venue: {
      name: String,
      address: String,
      city: String,
      location: pointSchema,
    },
    description: String,
    dressNote: String,
    howToReach: String,
    parking: String,
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
eventSchema.index({ weddingId: 1, startsAt: 1 });
eventSchema.index(
  { weddingId: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true } },
);

const householdSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    nameSearch: { type: String, required: true },
    side: { type: String, required: true, enum: ["bride", "groom", "other"] },
    maxPeople: { type: Number, required: true },
    invitedEventIds: { type: [Schema.Types.ObjectId], required: true },
    inviteToken: { type: String, required: true },
    email: String,
    phone: String,
    notes: String,
    invitationEmailSentAt: Date,
    createdBy: { type: Schema.Types.ObjectId, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
householdSchema.index({ inviteToken: 1 }, { unique: true });
householdSchema.index({ weddingId: 1, nameSearch: 1 });

const rsvpSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    householdId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, required: true, enum: ["yes", "no"] },
    attendingCount: { type: Number, required: true },
    diet: {
      veg: { type: Number, required: true },
      nonVeg: { type: Number, required: true },
      jain: { type: Number, required: true },
    },
    respondedAt: { type: Date, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
rsvpSchema.index({ householdId: 1, eventId: 1 }, { unique: true });
rsvpSchema.index({ weddingId: 1, eventId: 1 });

const taskSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    description: String,
    status: { type: String, required: true, enum: ["todo", "doing", "done"], default: "todo" },
    priority: { type: String, required: true, enum: ["low", "medium", "high"], default: "medium" },
    assigneeId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId,
    dueOn: String,
    completedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
taskSchema.index({ weddingId: 1, status: 1, dueOn: 1 });

const expenseSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    amountInr: { type: Number, required: true },
    spentOn: { type: String, required: true },
    category: { type: String, required: true },
    eventId: Schema.Types.ObjectId,
    vendorLabel: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
expenseSchema.index({ weddingId: 1, spentOn: -1, _id: -1 });

const vendorSchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    contactPerson: String,
    phone: String,
    email: String,
    agreedCostInr: Number,
    notes: String,
    source: { type: String, required: true, enum: ["manual", "places"], default: "manual" },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
vendorSchema.index({ weddingId: 1, category: 1 });

const gallerySchema = plainSchema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, required: true, enum: ["photo", "video"] },
    contentType: { type: String, required: true },
    bytes: { type: Number, required: true },
    storageKey: { type: String, required: true },
    publicPath: String,
    title: String,
    eventId: Schema.Types.ObjectId,
    uploadedBy: {
      type: { type: String, enum: ["organiser", "guest"], required: true },
      userId: Schema.Types.ObjectId,
    },
    hidden: { type: Boolean, required: true, default: false },
    schemaVersion: { type: Number, required: true, default: 1 },
  },
  options,
);
gallerySchema.index({ storageKey: 1 }, { unique: true });
gallerySchema.index({ weddingId: 1, hidden: 1, _id: -1 });

const rateLimitSchema = plainSchema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true },
    expireAt: { type: Date, required: true },
  },
  { ...options, _id: false },
);
rateLimitSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const UserModel = model<UserDoc>("User", "users", userSchema);
export const SessionModel = model<SessionDoc>("Session", "sessions", sessionSchema);
export const PasswordResetModel = model<PasswordResetDoc>("PasswordReset", "password_resets", passwordResetSchema);
export const WeddingModel = model<WeddingDoc>("Wedding", "weddings", weddingSchema);
export const MembershipModel = model<MembershipDoc>("Membership", "memberships", membershipSchema);
export const InvitationModel = model<InvitationDoc>("Invitation", "member_invitations", invitationSchema);
export const EventModel = model<EventDoc>("Event", "events", eventSchema);
export const HouseholdModel = model<HouseholdDoc>("Household", "households", householdSchema);
export const RsvpModel = model<RsvpDoc>("Rsvp", "rsvps", rsvpSchema);
export const TaskModel = model<TaskDoc>("Task", "tasks", taskSchema);
export const ExpenseModel = model<ExpenseDoc>("Expense", "expenses", expenseSchema);
export const VendorModel = model<VendorDoc>("Vendor", "vendors", vendorSchema);
export const GalleryModel = model<GalleryDoc>("GalleryItem", "gallery_items", gallerySchema);
export const RateLimitModel = model<RateLimitDoc>("RateLimit", "rate_limits", rateLimitSchema);

export const collectionModels = [
  UserModel,
  SessionModel,
  PasswordResetModel,
  WeddingModel,
  MembershipModel,
  InvitationModel,
  EventModel,
  HouseholdModel,
  RsvpModel,
  TaskModel,
  ExpenseModel,
  VendorModel,
  GalleryModel,
  RateLimitModel,
] as unknown as Model<unknown>[];
