import "server-only";

import mongoose from "mongoose";
import { z } from "zod";

import { daysUntilCivilDate } from "@/data/india-time";
import { passwordProblem } from "@/data/password-rules";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { emailField, idOf, isDuplicate, membershipFor, objectId, requireAdmin, requireMember, requireUser } from "@/modules/access";
import { randomToken, tokenHash, tokenHashQuery } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/connection";
import { EmailDeliveryError, sendMemberInvitation, sendPasswordReset } from "@/server/email/service";
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

async function db() {
  await connectToDatabase();
}

export { currentUser, requireAdmin, requireMember } from "@/modules/access";
export { kindFromTitle } from "@/modules/events/service";

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
    tokenHash: tokenHash(token),
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
  if (token) await SessionModel.deleteOne({ tokenHash: { $in: tokenHashQuery(token) } });
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
  const resetHash = tokenHash(token);
  await PasswordResetModel.deleteMany({ userId: user._id, usedAt: null });
  await PasswordResetModel.create({
    tokenHash: resetHash,
    userId: user._id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    schemaVersion: 1,
  });
  try {
    await sendPasswordReset({ to: user.email, token, idempotencyKey: `password-reset/${resetHash}` });
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
    { tokenHash: { $in: tokenHashQuery(input.token) }, usedAt: null, expiresAt: { $gt: new Date() } },
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
    tokenHash: tokenHash(token),
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
  invite.tokenHash = tokenHash(token);
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
  const invite = await InvitationModel.findOne({ tokenHash: { $in: tokenHashQuery(token) } });
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
  const invite = await InvitationModel.findOne({ tokenHash: { $in: tokenHashQuery(input.token) } });
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
  if (!objectId.safeParse(userId).success) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That person was not found.");
  if (idOf(user._id) === userId) throw new ServiceError(409, "CONFLICT", "SELF_REMOVE", "Use “Leave this wedding” on Account to leave.");
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
  await TaskModel.updateMany({ weddingId: membership.weddingId, assigneeId: target.userId }, { $unset: { assigneeId: "" } });
}


const meSchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();

export async function updateMe(request: Request, body: unknown) {
  const user = await requireUser(request);
  const input = meSchema.parse(body);
  await UserModel.updateOne({ _id: user._id }, { $set: { name: input.name } });
  return meFor({ _id: user._id, name: input.name, email: user.email });
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(128),
}).strict();

export async function changePassword(request: Request, body: unknown) {
  const user = await requireUser(request);
  const input = passwordSchema.parse(body);
  await consumeRateLimit("auth", clientIp(request), 20, 15 * 60 * 1000);
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ServiceError(400, "VALIDATION_ERROR", "WRONG_PASSWORD", "Your current password is not right.", { path: "currentPassword" });
  }
  const weak = passwordProblem(input.newPassword);
  if (weak) throw new ServiceError(400, "VALIDATION_ERROR", "WEAK_PASSWORD", weak, { path: "newPassword" });
  await UserModel.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(input.newPassword), passwordChangedAt: new Date() } });
  const token = sessionTokenFrom(request);
  const keep = token ? tokenHashQuery(token) : [];
  await SessionModel.deleteMany({ userId: user._id, tokenHash: { $nin: keep } });
}

export async function leaveWedding(request: Request) {
  const { user, membership } = await requireMember(request);
  const mongoSession = await mongoose.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      if (membership.role === "admin") {
        const updated = await WeddingModel.updateOne(
          { _id: membership.weddingId, adminCount: { $gt: 1 } },
          { $inc: { adminCount: -1 } },
          { session: mongoSession },
        );
        if (updated.matchedCount === 0) throw new ServiceError(409, "CONFLICT", "LAST_ADMIN", "Make someone else an Admin before you leave.");
      }
      await MembershipModel.deleteOne({ _id: membership._id }, { session: mongoSession });
    });
  } finally {
    await mongoSession.endSession();
  }
  await TaskModel.updateMany({ weddingId: membership.weddingId, assigneeId: user._id }, { $unset: { assigneeId: "" } });
}

export async function dashboard(request: Request) {
  const { user, membership } = await requireMember(request);
  const weddingId = membership.weddingId;
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That wedding was not found.");
  const now = new Date();
  const [events, tasks, households, answered, attending, expenses, vendors, members, gallery] = await Promise.all([
    EventModel.find({ weddingId }).sort({ startsAt: 1 }),
    TaskModel.find({ weddingId }),
    HouseholdModel.countDocuments({ weddingId }),
    RsvpModel.distinct("householdId", { weddingId }),
    RsvpModel.aggregate<{ _id: null; people: number }>([
      { $match: { weddingId, status: "yes" } },
      { $group: { _id: "$householdId", people: { $max: "$attendingCount" } } },
      { $group: { _id: null, people: { $sum: "$people" } } },
    ]),
    ExpenseModel.aggregate<{ _id: string; total: number }>([
      { $match: { weddingId } },
      { $group: { _id: "$category", total: { $sum: "$amountInr" } } },
      { $sort: { total: -1 } },
    ]),
    VendorModel.countDocuments({ weddingId }),
    MembershipModel.countDocuments({ weddingId }),
    GalleryModel.countDocuments({ weddingId, hidden: false }),
  ]);
  const primary = events.find((event) => event.isPrimary);
  const civil = primary
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(primary.startsAt)
    : wedding.weddingDate;
  const next = events.find((event) => event.startsAt.getTime() >= now.getTime() - 6 * 60 * 60 * 1000);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const inTwoWeeks = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now.getTime() + 14 * DAY));
  const open = tasks.filter((task) => task.status !== "done");
  const nearing = open
    .filter((task) => task.dueOn && task.dueOn <= inTwoWeeks)
    .sort((a, b) => (a.dueOn ?? "").localeCompare(b.dueOn ?? ""))
    .slice(0, 6);
  const assignees = await UserModel.find({ _id: { $in: nearing.map((task) => task.assigneeId).filter(Boolean) } }, { name: 1 });
  const names = new Map(assignees.map((person) => [idOf(person._id), person.name]));
  const site = wedding.site;
  return {
    wedding: { brideName: wedding.brideName, groomName: wedding.groomName, title: wedding.title ?? null, city: wedding.city, weddingDate: wedding.weddingDate },
    countdown: {
      date: civil,
      daysToGo: daysUntilCivilDate(civil, now),
      muhuratAt: primary?.muhuratAt ? primary.muhuratAt.toISOString() : null,
      source: primary ? "primary_event" : "wedding_date",
    },
    nextEvent: next
      ? { id: idOf(next._id), title: next.title, kind: next.kind, startsAt: next.startsAt.toISOString(), venue: [next.venue?.name, next.venue?.city].filter(Boolean).join(", ") || null }
      : null,
    events: events.map((event) => ({ id: idOf(event._id), title: event.title, kind: event.kind, startsAt: event.startsAt.toISOString(), isPrimary: event.isPrimary })),
    counts: {
      events: events.length,
      eventsUpcoming: events.filter((event) => event.startsAt.getTime() >= now.getTime()).length,
      tasksDone: tasks.length - open.length,
      tasksTotal: tasks.length,
      tasksMine: open.filter((task) => task.assigneeId && idOf(task.assigneeId) === idOf(user._id)).length,
      households,
      householdsAnswered: answered.length,
      replies: answered.length,
      peopleComing: attending[0]?.people ?? 0,
      expensesTotalInr: expenses.reduce((sum, row) => sum + row.total, 0),
      vendors,
      members,
      photos: gallery,
    },
    spendByCategory: expenses.map((row) => ({ category: row._id, totalInr: row.total })),
    tasksNearingDue: nearing.map((task) => ({
      id: idOf(task._id),
      title: task.title,
      dueOn: task.dueOn ?? null,
      priority: task.priority,
      overdue: Boolean(task.dueOn && task.dueOn < today),
      assigneeName: task.assigneeId ? names.get(idOf(task.assigneeId)) ?? null : null,
    })),
    site: { published: Boolean(site?.published && site.slug), slug: site?.slug ?? null },
  };
}
