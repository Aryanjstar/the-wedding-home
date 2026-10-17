import type { Types } from "mongoose";

type Id = Types.ObjectId;

export type MemberRole = "admin" | "manager";

export interface UserDoc {
  name: string;
  email: string;
  passwordHash: string;
  passwordChangedAt?: Date | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  tokenHash: string;
  userId: Id;
  expiresAt: Date;
  lastSeenAt: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordResetDoc {
  tokenHash: string;
  userId: Id;
  expiresAt: Date;
  usedAt?: Date | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeddingDoc {
  brideName: string;
  groomName: string;
  title?: string | null;
  weddingDate: string;
  city: string;
  story?: string | null;
  adminCount: number;
  createdBy: Id;
  site?: {
    slug?: string | null;
    published?: boolean;
    publishedAt?: Date | null;
    theme?: { packId?: string };
    liveUrl?: string | null;
    stay?: string | null;
    helplines?: Array<{ side: "bride" | "groom"; name: string; phone: string }>;
    families?: {
      bride?: { heading?: string | null; blurb?: string | null } | null;
      groom?: { heading?: string | null; blurb?: string | null } | null;
    } | null;
    aashirwad?: Array<{ _id: Id; author: string; relation?: string | null; message: string; createdAt: Date }>;
    giftNote?: string | null;
  };
  gallery: {
    token: string;
    enabled?: boolean;
    guestUploadEnabled?: boolean;
  };
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipDoc {
  weddingId: Id;
  userId: Id;
  role: MemberRole;
  joinedVia: "creator" | "invitation";
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationDoc {
  weddingId: Id;
  email: string;
  role: MemberRole;
  tokenHash: string;
  status: "pending" | "accepted" | "revoked";
  invitedBy: Id;
  expiresAt: Date;
  acceptedAt?: Date | null;
  acceptedBy?: Id | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemeOverrideDoc {
  world?: string | null;
  accent?: string | null;
  music?: string | null;
}

export interface EventDoc {
  weddingId: Id;
  kind: "roka" | "engagement" | "mehendi" | "haldi" | "sangeet" | "cocktail" | "wedding" | "reception" | "custom";
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  isPrimary: boolean;
  muhuratAt?: Date | null;
  venue?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    location?: { type?: "Point"; coordinates?: number[] } | null;
  } | null;
  description?: string | null;
  dressNote?: string | null;
  howToReach?: string | null;
  parking?: string | null;
  themeOverride?: ThemeOverrideDoc | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HouseholdDoc {
  weddingId: Id;
  name: string;
  nameSearch: string;
  side: "bride" | "groom" | "other";
  maxPeople: number;
  invitedEventIds: Id[];
  inviteToken: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  invitationEmailSentAt?: Date | null;
  createdBy: Id;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RsvpDoc {
  weddingId: Id;
  householdId: Id;
  eventId: Id;
  status: "yes" | "no";
  attendingCount: number;
  diet: { veg: number; nonVeg: number; jain: number };
  respondedAt: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDoc {
  weddingId: Id;
  title: string;
  description?: string | null;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  assigneeId?: Id | null;
  eventId?: Id | null;
  dueOn?: string | null;
  completedAt?: Date | null;
  createdBy: Id;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseDoc {
  weddingId: Id;
  title: string;
  amountInr: number;
  spentOn: string;
  category: string;
  eventId?: Id | null;
  vendorId?: Id | null;
  vendorLabel?: string | null;
  notes?: string | null;
  createdBy: Id;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorDoc {
  weddingId: Id;
  name: string;
  category: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  agreedCostInr?: number | null;
  eventIds?: Id[];
  notes?: string | null;
  place?: { provider?: "osm" | null; id?: string | null; lat?: number | null; lng?: number | null } | null;
  source: "manual" | "places";
  createdBy: Id;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GalleryDoc {
  weddingId: Id;
  kind: "photo" | "video";
  contentType: string;
  bytes: number;
  storageKey: string;
  publicPath?: string | null;
  title?: string | null;
  eventId?: Id | null;
  uploadedBy: { type: "organiser" | "guest"; userId?: Id | null };
  hidden: boolean;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaDoc {
  storageKey: string;
  contentType: string;
  bytes: number;
  data: Buffer;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitDoc {
  _id: string;
  count: number;
  expireAt: Date;
}

export interface EmailJobDoc {
  weddingId: Id;
  kind: "please_rsvp" | "see_you_soon";
  origin: "scheduled" | "send_now";
  householdId: Id;
  eventId: Id;
  dedupeKey: string;
  batchId?: Id | null;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";
  runAfter: Date;
  attempts: number;
  lockedAt?: Date | null;
  lastError?: string | null;
  sentAt?: Date | null;
  expireAt?: Date | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
