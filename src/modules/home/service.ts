import "server-only";

import mongoose from "mongoose";
import { z } from "zod";

import { daysUntilCivilDate } from "@/data/india-time";
import { passwordProblem } from "@/data/password-rules";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { randomToken, sha256Hex } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/connection";
import { EmailDeliveryError, sendHouseholdInvitation, sendMemberInvitation, sendPasswordReset } from "@/server/email/service";
import {
  EventModel,
  ExpenseModel,
  GalleryModel,
  HouseholdModel,
  InvitationModel,
  MembershipModel,
  PasswordResetModel,
  RsvpModel,
  SessionModel,
  TaskModel,
  UserModel,
  VendorModel,
  WeddingModel,
} from "@/server/db/schemas";
import { ServiceError, sessionTokenFrom } from "@/server/http/handle";
import { clientIp, consumeRateLimit } from "@/server/http/rate-limit";

const DAY = 86_400_000;
const emailField = z.string().trim().toLowerCase().pipe(z.email());
const objectId = z.string().regex(/^[a-f0-9]{24}$/i);

const KINDS = ["roka", "engagement", "mehendi", "haldi", "sangeet", "cocktail", "wedding", "reception", "custom"] as const;

export function kindFromTitle(title: string): (typeof KINDS)[number] {
  const key = title.trim().toLowerCase();
  return (KINDS as readonly string[]).includes(key) ? (key as (typeof KINDS)[number]) : "custom";
}

async function db() {
  await connectToDatabase();
}

function idOf(value: unknown): string {
  return String(value);
}

export async function currentUser(request: Request) {
  await db();
  const token = sessionTokenFrom(request);
  if (!token) return null;
  const session = await SessionModel.findOne({ tokenHash: sha256Hex(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await UserModel.findById(session.userId);
  if (!user) return null;
  return user;
}

async function requireUser(request: Request) {
  const user = await currentUser(request);
  if (!user) throw new ServiceError(401, "UNAUTHENTICATED", "NO_SESSION", "Sign in to continue.");
  return user;
}

async function membershipFor(userId: mongoose.Types.ObjectId) {
  return MembershipModel.findOne({ userId });
}

async function requireMember(request: Request) {
  const user = await requireUser(request);
  const membership = await membershipFor(user._id);
  if (!membership) throw new ServiceError(403, "FORBIDDEN", "NO_WEDDING", "Create the wedding first.");
  return { user, membership };
}

async function requireAdmin(request: Request) {
  const context = await requireMember(request);
  if (context.membership.role !== "admin") {
    throw new ServiceError(403, "FORBIDDEN", "NOT_ADMIN", "Only an Admin can do that.");
  }
  return context;
}

async function meFor(user: { _id: mongoose.Types.ObjectId; name: string; email: string }) {
  const membership = await membershipFor(user._id);
  const wedding = membership ? await WeddingModel.findById(membership.weddingId) : null;
  return {
    user: { id: idOf(user._id), name: user.name, email: user.email },
    membership: membership ? { weddingId: idOf(membership.weddingId), role: membership.role } : null,
    wedding: wedding
      ? {
          id: idOf(wedding._id),
          brideName: wedding.brideName,
          groomName: wedding.groomName,
          title: wedding.title ?? null,
          weddingDate: wedding.weddingDate,
          city: wedding.city,
        }
      : null,
  };
}

async function openSession(userId: mongoose.Types.ObjectId) {
  const token = randomToken();
  const now = new Date();
  await SessionModel.create({
    tokenHash: sha256Hex(token),
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * DAY),
    lastSeenAt: now,
    schemaVersion: 1,
  });
  return token;
}

async function claimInvitation(user: { _id: mongoose.Types.ObjectId; email: string }) {
  if (await membershipFor(user._id)) return;
  const invite = await InvitationModel.findOne({
    email: user.email,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!invite) return;

  const mongoSession = await mongoose.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      const claimed = await InvitationModel.findOneAndUpdate(
        { _id: invite._id, status: "pending", expiresAt: { $gt: new Date() } },
        { status: "accepted", acceptedAt: new Date(), acceptedBy: user._id },
        { session: mongoSession },
      );
      if (!claimed) return;
      await MembershipModel.create(
        [{ weddingId: invite.weddingId, userId: user._id, role: invite.role, joinedVia: "invitation", schemaVersion: 1 }],
        { session: mongoSession },
      );
      if (invite.role === "admin") {
        await WeddingModel.updateOne({ _id: invite.weddingId }, { $inc: { adminCount: 1 } }, { session: mongoSession });
      }
    });
  } finally {
    await mongoSession.endSession();
  }
}

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailField,
  password: z.string().min(10).max(128),
}).strict();

export async function signUp(request: Request, body: unknown) {
  await db();
  const input = signupSchema.parse(body);
  const weak = passwordProblem(input.password);
  if (weak) throw new ServiceError(400, "VALIDATION_ERROR", "WEAK_PASSWORD", weak);
  await consumeRateLimit("auth", clientIp(request), 20, 15 * 60 * 1000);
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) throw new ServiceError(409, "CONFLICT", "EMAIL_TAKEN", "That email already has an account.");
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    schemaVersion: 1,
  });
  await claimInvitation(user);
  const token = await openSession(user._id);
  return { token, me: await meFor(user) };
}

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(200),
}).strict();

export async function logIn(request: Request, body: unknown) {
  await db();
  const input = loginSchema.parse(body);
  await consumeRateLimit("auth", clientIp(request), 20, 15 * 60 * 1000);
  const user = await UserModel.findOne({ email: input.email });
  const matches = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !matches) {
    throw new ServiceError(401, "UNAUTHENTICATED", "INVALID_CREDENTIALS", "That email and password do not match.");
  }
  await claimInvitation(user);
  const token = await openSession(user._id);
  return { token, me: await meFor(user) };
}

export async function logOut(request: Request) {
  await db();
  const token = sessionTokenFrom(request);
  if (token) await SessionModel.deleteOne({ tokenHash: sha256Hex(token) });
}

const forgotSchema = z.object({
  email: emailField,
}).strict();

export async function forgotPassword(request: Request, body: unknown) {
  await db();
  const input = forgotSchema.parse(body);
  await consumeRateLimit("forgot-ip", clientIp(request), 5, 60 * 60 * 1000);
  await consumeRateLimit("forgot-email", input.email, 3, 60 * 60 * 1000);
  const user = await UserModel.findOne({ email: input.email });
  if (!user) return;

  const token = randomToken();
  const tokenHash = sha256Hex(token);
  await PasswordResetModel.deleteMany({ userId: user._id, usedAt: null });
  await PasswordResetModel.create({
    tokenHash,
    userId: user._id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    schemaVersion: 1,
  });
  try {
    await sendPasswordReset({ to: user.email, token, idempotencyKey: `password-reset/${tokenHash}` });
  } catch (error) {
    if (!(error instanceof EmailDeliveryError)) throw error;
    console.error(JSON.stringify({ operation: "forgot-password", userId: idOf(user._id), code: "RESEND_FAILED" }));
  }
}

const resetSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(10).max(128),
}).strict();

export async function resetPassword(request: Request, body: unknown) {
  await db();
  const input = resetSchema.parse(body);
  const weak = passwordProblem(input.password);
  if (weak) throw new ServiceError(400, "VALIDATION_ERROR", "WEAK_PASSWORD", weak);
  await consumeRateLimit("reset", clientIp(request), 10, 15 * 60 * 1000);
  const spent = await PasswordResetModel.findOneAndUpdate(
    { tokenHash: sha256Hex(input.token), usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() },
  );
  if (!spent) {
    throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_TOKEN", "That reset link is no longer valid. Ask for a new one.");
  }
  const user = await UserModel.findById(spent.userId);
  if (!user) {
    throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_TOKEN", "That reset link is no longer valid. Ask for a new one.");
  }
  user.passwordHash = await hashPassword(input.password);
  user.passwordChangedAt = new Date();
  await user.save();
  await SessionModel.deleteMany({ userId: user._id });
}

export async function readMe(request: Request) {
  const user = await requireUser(request);
  return meFor(user);
}

const weddingSchema = z.object({
  brideName: z.string().trim().min(1).max(100),
  groomName: z.string().trim().min(1).max(100),
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().trim().min(1).max(80),
  title: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
  story: z.union([z.string().trim().min(1).max(2000), z.null()]).optional(),
}).strict();

export async function createWedding(request: Request, body: unknown) {
  const user = await requireUser(request);
  const input = weddingSchema.parse(body);
  if (await membershipFor(user._id)) {
    throw new ServiceError(409, "CONFLICT", "ALREADY_HAS_WEDDING", "This account already has a wedding.");
  }

  const mongoSession = await mongoose.startSession();
  let weddingId = "";
  try {
    await mongoSession.withTransaction(async () => {
      const [wedding] = await WeddingModel.create(
        [{
          brideName: input.brideName,
          groomName: input.groomName,
          ...(input.title ? { title: input.title } : {}),
          weddingDate: input.weddingDate,
          city: input.city,
          ...(input.story ? { story: input.story } : {}),
          adminCount: 1,
          createdBy: user._id,
          site: { published: false, theme: { packId: "classical" } },
          gallery: { token: randomToken(), enabled: true, guestUploadEnabled: true },
          schemaVersion: 1,
        }],
        { session: mongoSession },
      );
      weddingId = idOf(wedding._id);
      await MembershipModel.create(
        [{ weddingId: wedding._id, userId: user._id, role: "admin", joinedVia: "creator", schemaVersion: 1 }],
        { session: mongoSession },
      );
    });
  } catch (error) {
    if (isDuplicate(error)) throw new ServiceError(409, "CONFLICT", "ALREADY_HAS_WEDDING", "This account already has a wedding.");
    throw error;
  } finally {
    await mongoSession.endSession();
  }

  return { me: await meFor(user), weddingId };
}

export async function updateWedding(request: Request, body: unknown) {
  const { user, membership } = await requireMember(request);
  const input = weddingSchema.parse(body);
  const changes: Record<string, unknown> = {
    brideName: input.brideName,
    groomName: input.groomName,
    weddingDate: input.weddingDate,
    city: input.city,
  };
  if (input.title !== undefined) changes.title = input.title;
  if (input.story !== undefined) changes.story = input.story;
  await WeddingModel.updateOne({ _id: membership.weddingId }, changes);
  return meFor(user);
}

export async function readWedding(request: Request) {
  const { membership } = await requireMember(request);
  const wedding = await WeddingModel.findById(membership.weddingId);
  if (!wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That wedding was not found.");
  return {
    id: idOf(wedding._id),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    story: wedding.story ?? null,
    weddingDate: wedding.weddingDate,
    city: wedding.city,
    cover: null,
    updatedAt: wedding.updatedAt,
  };
}

function mapsQuery(venue: { name?: string | null; address?: string | null; city?: string | null } | null | undefined) {
  if (!venue) return null;
  const query = [venue.name, venue.address, venue.city].filter(Boolean).join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function presentEvent(event: {
  _id: unknown;
  kind: string;
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  isPrimary: boolean;
  muhuratAt?: Date | null;
  venue?: { name?: string | null; address?: string | null; city?: string | null } | null;
  description?: string | null;
}) {
  const venue = event.venue?.name || event.venue?.address || event.venue?.city ? event.venue : null;
  return {
    id: idOf(event._id),
    kind: event.kind,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    isPrimary: event.isPrimary,
    muhuratAt: event.muhuratAt ? event.muhuratAt.toISOString() : null,
    venue: venue
      ? {
          name: venue.name ?? null,
          address: venue.address ?? null,
          city: venue.city ?? null,
          mapsUrl: mapsQuery(venue),
        }
      : null,
    description: event.description ?? null,
  };
}

export async function listEvents(request: Request) {
  const { membership } = await requireMember(request);
  const events = await EventModel.find({ weddingId: membership.weddingId }).sort({ startsAt: 1 });
  return { items: events.map((event) => presentEvent(event)) };
}

const iso = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Use a date and time.");

const eventSchema = z.object({
  kind: z.enum(KINDS).optional(),
  title: z.string().trim().min(1).max(120),
  startsAt: iso,
  isPrimary: z.boolean().optional(),
  muhuratAt: iso.nullable().optional(),
  venue: z.object({
    name: z.string().trim().max(120).optional(),
    address: z.string().trim().max(300).optional(),
    city: z.string().trim().max(80).optional(),
  }).strict().optional(),
  description: z.string().trim().max(600).optional(),
}).strict();

export async function createEvent(request: Request, body: unknown) {
  const { user, membership } = await requireMember(request);
  const input = eventSchema.parse(body);
  const count = await EventModel.countDocuments({ weddingId: membership.weddingId });
  if (count >= 30) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This wedding already has 30 functions.");
  const isPrimary = Boolean(input.isPrimary);
  if (input.muhuratAt && !isPrimary) {
    throw new ServiceError(400, "VALIDATION_ERROR", "MUHURAT_NOT_PRIMARY", "Muhurat belongs on the primary function.");
  }

  const venue = input.venue && (input.venue.name || input.venue.address || input.venue.city) ? input.venue : undefined;
  const mongoSession = await mongoose.startSession();
  let createdId = "";
  try {
    await mongoSession.withTransaction(async () => {
      if (isPrimary) {
        await EventModel.updateMany({ weddingId: membership.weddingId, isPrimary: true }, { isPrimary: false }, { session: mongoSession });
      }
      const [event] = await EventModel.create(
        [{
          weddingId: membership.weddingId,
          kind: input.kind ?? kindFromTitle(input.title),
          title: input.title,
          startsAt: new Date(input.startsAt),
          isPrimary,
          muhuratAt: input.muhuratAt ? new Date(input.muhuratAt) : undefined,
          venue,
          description: input.description,
          schemaVersion: 1,
        }],
        { session: mongoSession },
      );
      createdId = idOf(event._id);
    });
  } finally {
    await mongoSession.endSession();
  }

  const event = await EventModel.findById(createdId);
  if (!event) throw new ServiceError(500, "INTERNAL_ERROR", "EVENT_MISSING", "The function was not saved.");
  void user;
  return presentEvent(event);
}

export async function deleteEvent(request: Request, eventId: string) {
  const { membership } = await requireMember(request);
  if (!objectId.safeParse(eventId).success) {
    throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_ID", "That function was not found.");
  }
  const removed = await EventModel.findOneAndDelete({ _id: eventId, weddingId: membership.weddingId });
  if (!removed) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That function was not found.");
}

export async function listMembers(request: Request) {
  const { membership } = await requireAdmin(request);
  const rows = await MembershipModel.find({ weddingId: membership.weddingId });
  const users = await UserModel.find({ _id: { $in: rows.map((row) => row.userId) } });
  const byId = new Map(users.map((user) => [idOf(user._id), user]));
  const invitations = await InvitationModel.find({ weddingId: membership.weddingId, status: "pending", expiresAt: { $gt: new Date() } });
  return {
    members: rows.map((row) => {
      const user = byId.get(idOf(row.userId));
      return {
        userId: idOf(row.userId),
        name: user?.name ?? "Organiser",
        email: user?.email ?? "",
        role: row.role,
        joinedAt: row.createdAt,
      };
    }),
    invitations: invitations.map((invite) => ({
      id: idOf(invite._id),
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
    })),
  };
}

const inviteSchema = z.object({
  email: emailField,
  role: z.enum(["admin", "manager"]),
}).strict();

export async function inviteMember(request: Request, body: unknown) {
  const { user, membership } = await requireAdmin(request);
  await consumeRateLimit("member-invite", idOf(membership.weddingId), 20, 24 * 60 * 60 * 1000);
  const input = inviteSchema.parse(body);
  const memberCount = await MembershipModel.countDocuments({ weddingId: membership.weddingId });
  const pendingCount = await InvitationModel.countDocuments({ weddingId: membership.weddingId, status: "pending" });
  if (memberCount + pendingCount >= 30) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This wedding already has 30 organisers.");

  const existingUser = await UserModel.findOne({ email: input.email });
  if (existingUser) {
    const other = await MembershipModel.findOne({ userId: existingUser._id });
    if (other && idOf(other.weddingId) === idOf(membership.weddingId)) {
      throw new ServiceError(409, "CONFLICT", "ALREADY_MEMBER", "They are already organising this wedding.");
    }
    if (other) throw new ServiceError(409, "CONFLICT", "MEMBER_OF_OTHER_WEDDING", "That email is already on a wedding.");
  }

  const pending = await InvitationModel.findOne({ weddingId: membership.weddingId, email: input.email, status: "pending" });
  if (pending && pending.expiresAt.getTime() > Date.now()) {
    throw new ServiceError(409, "CONFLICT", "INVITATION_PENDING", "That invitation is already waiting.");
  }
  if (pending) {
    pending.status = "revoked";
    await pending.save();
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 7 * DAY);
  const invite = await InvitationModel.create({
    weddingId: membership.weddingId,
    email: input.email,
    role: input.role,
    tokenHash: sha256Hex(token),
    status: "pending",
    invitedBy: user._id,
    expiresAt,
    schemaVersion: 1,
  });
  const wedding = await WeddingModel.findById(membership.weddingId);
  try {
    await sendMemberInvitation({
      to: input.email,
      token,
      brideName: wedding?.brideName ?? "The couple",
      groomName: wedding?.groomName ?? "",
      role: input.role,
      expiresAt,
      idempotencyKey: `member-invitation/${idOf(invite._id)}`,
    });
  } catch (error) {
    if (!(error instanceof EmailDeliveryError)) throw error;
    throw new ServiceError(
      503,
      "INTERNAL_ERROR",
      "DEPENDENCY_UNAVAILABLE",
      "The invitation is saved. The email did not go out. Resend it in a moment.",
      { invitationId: idOf(invite._id) },
    );
  }
  return { id: idOf(invite._id), email: invite.email, role: invite.role, expiresAt: invite.expiresAt };
}

async function pendingInvitation(weddingId: unknown, invitationId: string) {
  if (!objectId.safeParse(invitationId).success) {
    throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That invitation was not found.");
  }
  const invite = await InvitationModel.findOne({ _id: invitationId, weddingId, status: "pending" });
  if (!invite) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That invitation was not found.");
  return invite;
}

export async function resendMemberInvitation(request: Request, invitationId: string) {
  const { membership } = await requireAdmin(request);
  const invite = await pendingInvitation(membership.weddingId, invitationId);
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 7 * DAY);
  invite.tokenHash = sha256Hex(token);
  invite.expiresAt = expiresAt;
  await invite.save();
  const wedding = await WeddingModel.findById(membership.weddingId);
  try {
    await sendMemberInvitation({
      to: invite.email,
      token,
      brideName: wedding?.brideName ?? "The couple",
      groomName: wedding?.groomName ?? "",
      role: invite.role === "admin" ? "admin" : "manager",
      expiresAt,
      idempotencyKey: `member-invitation/${invitationId}/${invite.tokenHash.slice(0, 16)}`,
    });
  } catch (error) {
    if (!(error instanceof EmailDeliveryError)) throw error;
    throw new ServiceError(
      503,
      "INTERNAL_ERROR",
      "DEPENDENCY_UNAVAILABLE",
      "The invitation is saved. The email did not go out. Resend it in a moment.",
      { invitationId },
    );
  }
}

export async function revokeMemberInvitation(request: Request, invitationId: string) {
  const { membership } = await requireAdmin(request);
  const invite = await pendingInvitation(membership.weddingId, invitationId);
  invite.status = "revoked";
  await invite.save();
}

function invitationProblem(invite: { status: string; expiresAt: Date } | null) {
  if (!invite) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That invitation was not found.");
  if (invite.status === "revoked") {
    throw new ServiceError(409, "CONFLICT", "INVITATION_REVOKED", "This invitation was withdrawn.");
  }
  if (invite.status === "accepted") {
    throw new ServiceError(409, "CONFLICT", "INVITATION_USED", "This invitation has already been used.");
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    throw new ServiceError(409, "CONFLICT", "INVITATION_EXPIRED", "This invitation has expired. Ask an Admin to send it again.");
  }
}

export async function readMemberInvite(token: string) {
  await db();
  if (!token || token.length < 20) {
    throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That invitation was not found.");
  }
  const invite = await InvitationModel.findOne({ tokenHash: sha256Hex(token) });
  invitationProblem(invite);
  const wedding = invite ? await WeddingModel.findById(invite.weddingId) : null;
  if (!invite || !wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That invitation was not found.");
  return {
    wedding: { brideName: wedding.brideName, groomName: wedding.groomName },
    role: invite.role,
    email: invite.email,
  };
}

const joinSchema = z.object({ token: z.string().trim().min(20).max(200) }).strict();

export async function joinWedding(request: Request, body: unknown) {
  const user = await requireUser(request);
  const input = joinSchema.parse(body);
  const invite = await InvitationModel.findOne({ tokenHash: sha256Hex(input.token) });
  invitationProblem(invite);
  if (!invite) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That invitation was not found.");
  if (user.email !== invite.email) {
    throw new ServiceError(403, "FORBIDDEN", "INVITE_EMAIL_MISMATCH", `Sign in as ${invite.email} to accept this invitation.`);
  }

  const existing = await membershipFor(user._id);
  if (existing) {
    if (idOf(existing.weddingId) === idOf(invite.weddingId)) return meFor(user);
    throw new ServiceError(409, "CONFLICT", "MEMBER_OF_OTHER_WEDDING", "That account is already on a wedding.");
  }

  const mongoSession = await mongoose.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      const claimed = await InvitationModel.findOneAndUpdate(
        { _id: invite._id, status: "pending", expiresAt: { $gt: new Date() } },
        { status: "accepted", acceptedAt: new Date(), acceptedBy: user._id },
        { session: mongoSession },
      );
      if (!claimed) throw new ServiceError(409, "CONFLICT", "INVITATION_USED", "This invitation has already been used.");
      await MembershipModel.create(
        [{ weddingId: invite.weddingId, userId: user._id, role: invite.role, joinedVia: "invitation", schemaVersion: 1 }],
        { session: mongoSession },
      );
      if (invite.role === "admin") {
        await WeddingModel.updateOne({ _id: invite.weddingId }, { $inc: { adminCount: 1 } }, { session: mongoSession });
      }
    });
  } finally {
    await mongoSession.endSession();
  }
  return meFor(user);
}

const roleSchema = z.object({ role: z.enum(["admin", "manager"]) }).strict();

export async function setMemberRole(request: Request, userId: string, body: unknown) {
  const { membership } = await requireAdmin(request);
  if (!objectId.safeParse(userId).success) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That person was not found.");
  const input = roleSchema.parse(body);
  const target = await MembershipModel.findOne({ weddingId: membership.weddingId, userId });
  if (!target) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That person was not found.");
  if (target.role === input.role) return { userId, role: input.role };

  const mongoSession = await mongoose.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      if (target.role === "admin" && input.role === "manager") {
        const updated = await WeddingModel.updateOne(
          { _id: membership.weddingId, adminCount: { $gt: 1 } },
          { $inc: { adminCount: -1 } },
          { session: mongoSession },
        );
        if (updated.matchedCount === 0) throw new ServiceError(409, "CONFLICT", "LAST_ADMIN", "The wedding keeps its last Admin.");
      }
      if (target.role === "manager" && input.role === "admin") {
        await WeddingModel.updateOne({ _id: membership.weddingId }, { $inc: { adminCount: 1 } }, { session: mongoSession });
      }
      await MembershipModel.updateOne({ _id: target._id }, { role: input.role }, { session: mongoSession });
    });
  } finally {
    await mongoSession.endSession();
  }
  return { userId, role: input.role };
}

export async function removeMember(request: Request, userId: string) {
  const { user, membership } = await requireAdmin(request);
  if (idOf(user._id) === userId) throw new ServiceError(409, "CONFLICT", "LAST_ADMIN", "Stay on the wedding, or ask another Admin.");
  const target = await MembershipModel.findOne({ weddingId: membership.weddingId, userId });
  if (!target) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That person was not found.");

  const mongoSession = await mongoose.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      if (target.role === "admin") {
        const updated = await WeddingModel.updateOne(
          { _id: membership.weddingId, adminCount: { $gt: 1 } },
          { $inc: { adminCount: -1 } },
          { session: mongoSession },
        );
        if (updated.matchedCount === 0) throw new ServiceError(409, "CONFLICT", "LAST_ADMIN", "The wedding keeps its last Admin.");
      }
      await MembershipModel.deleteOne({ _id: target._id }, { session: mongoSession });
    });
  } finally {
    await mongoSession.endSession();
  }
}

export async function dashboard(request: Request) {
  const { membership } = await requireMember(request);
  const wedding = await WeddingModel.findById(membership.weddingId);
  if (!wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That wedding was not found.");
  const [events, tasks, households, expenses, vendors] = await Promise.all([
    EventModel.find({ weddingId: wedding._id }).sort({ startsAt: 1 }),
    TaskModel.find({ weddingId: wedding._id }),
    HouseholdModel.countDocuments({ weddingId: wedding._id }),
    ExpenseModel.find({ weddingId: wedding._id }),
    VendorModel.countDocuments({ weddingId: wedding._id }),
  ]);
  const primary = events.find((event) => event.isPrimary);
  const date = primary ? primary.startsAt.toISOString().slice(0, 10) : wedding.weddingDate;
  const civil = primary ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(primary.startsAt) : wedding.weddingDate;
  const now = new Date();
  const next = events.find((event) => event.startsAt.getTime() >= now.getTime());
  return {
    wedding: { brideName: wedding.brideName, groomName: wedding.groomName, title: wedding.title ?? null, city: wedding.city },
    countdown: {
      date: civil,
      daysToGo: daysUntilCivilDate(civil, now),
      muhuratAt: primary?.muhuratAt ? primary.muhuratAt.toISOString() : null,
      source: primary ? "primary_event" : "wedding_date",
    },
    nextEvent: next ? { id: idOf(next._id), title: next.title, startsAt: next.startsAt.toISOString() } : null,
    counts: {
      events: events.length,
      tasksDone: tasks.filter((task) => task.status === "done").length,
      tasksTotal: tasks.length,
      households,
      expensesTotalInr: expenses.reduce((sum, item) => sum + item.amountInr, 0),
      vendors,
    },
  };
  void date;
}

export async function listHouseholds(request: Request) {
  const { membership } = await requireMember(request);
  const rows = await HouseholdModel.find({ weddingId: membership.weddingId }).sort({ nameSearch: 1 });
  const replies = await RsvpModel.find({ weddingId: membership.weddingId });
  return {
    items: rows.map((row) => ({
      id: idOf(row._id),
      name: row.name,
      side: row.side,
      maxPeople: row.maxPeople,
      invitedEventIds: row.invitedEventIds.map(idOf),
      email: row.email ?? null,
      phone: row.phone ?? null,
      invitationEmailSentAt: row.invitationEmailSentAt ? row.invitationEmailSentAt.toISOString() : null,
      rsvps: replies
        .filter((reply) => idOf(reply.householdId) === idOf(row._id))
        .map((reply) => ({
          eventId: idOf(reply.eventId),
          status: reply.status,
          attendingCount: reply.attendingCount,
          diet: reply.diet,
        })),
    })),
  };
}

const householdSchema = z.object({
  name: z.string().trim().min(1).max(100),
  side: z.enum(["bride", "groom", "other"]),
  maxPeople: z.number().int().min(1).max(25),
  invitedEventIds: z.array(objectId).max(30),
  email: z.string().trim().toLowerCase().max(200).optional(),
}).strict();

export async function createHousehold(request: Request, body: unknown) {
  const { user, membership } = await requireMember(request);
  const input = householdSchema.parse(body);
  const count = await HouseholdModel.countDocuments({ weddingId: membership.weddingId });
  if (count >= 2000) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This wedding already has 2,000 households.");
  const events = await EventModel.find({ _id: { $in: input.invitedEventIds }, weddingId: membership.weddingId });
  if (events.length !== input.invitedEventIds.length) {
    throw new ServiceError(400, "VALIDATION_ERROR", "UNKNOWN_EVENT", "Invite them to functions on this wedding.");
  }
  const email = input.email ? emailField.safeParse(input.email) : null;
  if (input.email && !email?.success) {
    throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_EMAIL", "Enter a valid email address.");
  }
  const row = await HouseholdModel.create({
    weddingId: membership.weddingId,
    name: input.name,
    nameSearch: input.name.toLowerCase(),
    side: input.side,
    maxPeople: input.maxPeople,
    invitedEventIds: input.invitedEventIds,
    inviteToken: randomToken(),
    email: email?.success ? email.data : undefined,
    createdBy: user._id,
    schemaVersion: 1,
  });
  return { id: idOf(row._id), name: row.name };
}

export async function shareHousehold(request: Request, householdId: string) {
  const { membership } = await requireMember(request);
  if (!objectId.safeParse(householdId).success) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That household was not found.");
  const row = await HouseholdModel.findOne({ _id: householdId, weddingId: membership.weddingId });
  if (!row) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That household was not found.");
  const wedding = await WeddingModel.findById(membership.weddingId);
  const { getAppEnv } = await import("@/config/env");
  const inviteUrl = `${getAppEnv().NEXT_PUBLIC_APP_URL}/i/${row.inviteToken}`;
  const names = wedding ? `${wedding.brideName} & ${wedding.groomName}` : "The family";
  const message = `${names} invite you. Open your link: ${inviteUrl}`;
  return { inviteUrl, message, waUrl: `https://wa.me/?text=${encodeURIComponent(message)}` };
}

export async function sendHouseholdEmail(request: Request, householdId: string) {
  const { membership } = await requireMember(request);
  await consumeRateLimit("household-email", idOf(membership.weddingId), 500, 24 * 60 * 60 * 1000);
  if (!objectId.safeParse(householdId).success) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That household was not found.");
  const row = await HouseholdModel.findOne({ _id: householdId, weddingId: membership.weddingId });
  if (!row) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That household was not found.");
  if (!row.email) throw new ServiceError(409, "CONFLICT", "NO_EMAIL", "Add an email address before sending.");
  const wedding = await WeddingModel.findById(membership.weddingId);
  if (!wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That wedding was not found.");
  try {
    await sendHouseholdInvitation({
      to: row.email,
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
      city: wedding.city,
      invitePath: `/i/${row.inviteToken}`,
      idempotencyKey: `household-invite/${idOf(row._id)}/${Date.now()}`,
    });
  } catch (error) {
    if (!(error instanceof EmailDeliveryError)) throw error;
    throw new ServiceError(503, "INTERNAL_ERROR", "DEPENDENCY_UNAVAILABLE", "The email did not go out. Try again in a moment.");
  }
  const sentAt = new Date();
  row.invitationEmailSentAt = sentAt;
  await row.save();
  return { invitationEmailSentAt: sentAt.toISOString() };
}

export async function readPublicInvite(token: string) {
  await db();
  if (!token || token.length < 20) return null;
  const row = await HouseholdModel.findOne({ inviteToken: token });
  if (!row) return null;
  const wedding = await WeddingModel.findById(row.weddingId);
  if (!wedding) return null;
  const events = await EventModel.find({ _id: { $in: row.invitedEventIds } }).sort({ startsAt: 1 });
  return {
    household: row.name,
    maxPeople: row.maxPeople,
    couple: `${wedding.brideName} & ${wedding.groomName}`,
    city: wedding.city,
    events: events.map((event) => presentEvent(event)),
  };
}

const rsvpSchema = z.object({
  people: z.number().int().min(0).max(25),
  veg: z.number().int().min(0),
  nonVeg: z.number().int().min(0),
  jain: z.number().int().min(0),
}).strict();

export async function savePublicRsvp(token: string, body: unknown) {
  await db();
  const input = rsvpSchema.parse(body);
  const row = await HouseholdModel.findOne({ inviteToken: token });
  if (!row) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That invitation was not found.");
  if (input.people > row.maxPeople) {
    throw new ServiceError(400, "VALIDATION_ERROR", "OVER_CAPACITY", "That is more people than this invitation allows.");
  }
  if (input.veg + input.nonVeg + input.jain !== input.people) {
    throw new ServiceError(400, "VALIDATION_ERROR", "DIET_MISMATCH", "Veg, non-veg, and Jain must add up to the people coming.");
  }
  const status = input.people === 0 ? "no" : "yes";
  for (const eventId of row.invitedEventIds) {
    await RsvpModel.findOneAndUpdate(
      { householdId: row._id, eventId },
      {
        weddingId: row.weddingId,
        householdId: row._id,
        eventId,
        status,
        attendingCount: input.people,
        diet: { veg: input.veg, nonVeg: input.nonVeg, jain: input.jain },
        respondedAt: new Date(),
        schemaVersion: 1,
      },
      { upsert: true },
    );
  }
}

export async function listTasks(request: Request) {
  const { membership } = await requireMember(request);
  const rows = await TaskModel.find({ weddingId: membership.weddingId }).sort({ createdAt: 1 });
  const users = await UserModel.find({ _id: { $in: rows.map((row) => row.assigneeId).filter(Boolean) } });
  const names = new Map(users.map((user) => [idOf(user._id), user.name]));
  return {
    items: rows.map((row) => ({
      id: idOf(row._id),
      title: row.title,
      status: row.status,
      priority: row.priority,
      assigneeName: row.assigneeId ? names.get(idOf(row.assigneeId)) ?? null : null,
      dueOn: row.dueOn ?? null,
    })),
  };
}

const taskSchema = z.object({
  title: z.string().trim().min(1).max(140),
  status: z.enum(["todo", "doing", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
}).strict();

export async function createTask(request: Request, body: unknown) {
  const { user, membership } = await requireMember(request);
  const input = taskSchema.parse(body);
  const count = await TaskModel.countDocuments({ weddingId: membership.weddingId });
  if (count >= 2000) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This wedding already has 2,000 tasks.");
  const status = input.status ?? "todo";
  const row = await TaskModel.create({
    weddingId: membership.weddingId,
    title: input.title,
    status,
    priority: input.priority ?? "medium",
    completedAt: status === "done" ? new Date() : undefined,
    createdBy: user._id,
    schemaVersion: 1,
  });
  return { id: idOf(row._id), title: row.title, status: row.status, priority: row.priority };
}

export async function listExpenses(request: Request) {
  const { membership } = await requireMember(request);
  const rows = await ExpenseModel.find({ weddingId: membership.weddingId }).sort({ spentOn: -1 });
  return {
    items: rows.map((row) => ({
      id: idOf(row._id),
      title: row.title,
      amountInr: row.amountInr,
      spentOn: row.spentOn,
      category: row.category,
    })),
    totalInr: rows.reduce((sum, row) => sum + row.amountInr, 0),
  };
}

const EXPENSE_CATEGORIES = ["venue", "catering", "photography", "videography", "decoration", "clothing", "jewellery", "entertainment", "invitations", "gifts", "travel", "makeup", "miscellaneous"] as const;

const expenseSchema = z.object({
  title: z.string().trim().min(1).max(140),
  amountInr: z.number().int().min(1).max(1_000_000_000),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(EXPENSE_CATEGORIES),
}).strict();

export async function createExpense(request: Request, body: unknown) {
  const { user, membership } = await requireMember(request);
  const input = expenseSchema.parse(body);
  const count = await ExpenseModel.countDocuments({ weddingId: membership.weddingId });
  if (count >= 10000) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This wedding already has 10,000 expenses.");
  const row = await ExpenseModel.create({
    ...input,
    weddingId: membership.weddingId,
    createdBy: user._id,
    schemaVersion: 1,
  });
  return { id: idOf(row._id) };
}

export async function listVendors(request: Request) {
  const { membership } = await requireMember(request);
  const rows = await VendorModel.find({ weddingId: membership.weddingId }).sort({ name: 1 });
  return {
    items: rows.map((row) => ({
      id: idOf(row._id),
      name: row.name,
      category: row.category,
      contactPerson: row.contactPerson ?? null,
      phone: row.phone ?? null,
      agreedCostInr: row.agreedCostInr ?? null,
    })),
  };
}

const VENDOR_CATEGORIES = ["photographer", "videographer", "venue", "caterer", "decorator", "dj", "makeup", "mehendi_artist", "pandit", "choreographer", "florist", "planner", "transport", "other"] as const;

const vendorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(VENDOR_CATEGORIES),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  agreedCostInr: z.number().int().min(0).optional(),
}).strict();

export async function createVendor(request: Request, body: unknown) {
  const { user, membership } = await requireMember(request);
  const input = vendorSchema.parse(body);
  const count = await VendorModel.countDocuments({ weddingId: membership.weddingId });
  if (count >= 300) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This wedding already has 300 vendors.");
  const row = await VendorModel.create({
    ...input,
    weddingId: membership.weddingId,
    source: "manual",
    createdBy: user._id,
    schemaVersion: 1,
  });
  return { id: idOf(row._id) };
}

export async function listPhotos(request: Request) {
  const { membership } = await requireMember(request);
  const rows = await GalleryModel.find({ weddingId: membership.weddingId, hidden: false, publicPath: { $type: "string" } }).sort({ createdAt: 1 });
  return {
    items: rows.map((row) => ({
      id: idOf(row._id),
      title: row.title ?? "Photograph",
      url: row.publicPath,
    })),
  };
}

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}
