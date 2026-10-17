import "server-only";

import type mongoose from "mongoose";
import { z } from "zod";

import { tokenHashQuery } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/connection";
import { MembershipModel, SessionModel, UserModel } from "@/server/db/schemas";
import { ServiceError, sessionTokenFrom } from "@/server/http/handle";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
export const civilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date.");
export const emailField = z.string().trim().toLowerCase().pipe(z.email());

export function idOf(value: unknown): string {
  return String(value);
}

export function notFound(what: string): never {
  throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", `That ${what} was not found.`);
}

/** Path ids that are not ObjectIds are simply not found, never a 500. */
export function assertId(value: string, what: string) {
  if (!objectId.safeParse(value).success) notFound(what);
}

/** Optional text: "" and whitespace become null so a field can be cleared. */
export function optionalText(max: number) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => (typeof value === "string" ? value.trim() || null : value))
    .pipe(z.union([z.string().max(max), z.null(), z.undefined()]));
}

export function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

export async function currentUser(request: Request) {
  await connectToDatabase();
  const token = sessionTokenFrom(request);
  if (!token) return null;
  const session = await SessionModel.findOne({ tokenHash: { $in: tokenHashQuery(token) }, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return UserModel.findById(session.userId);
}

export async function requireUser(request: Request) {
  const user = await currentUser(request);
  if (!user) throw new ServiceError(401, "UNAUTHENTICATED", "NO_SESSION", "Sign in to continue.");
  return user;
}

export async function membershipFor(userId: mongoose.Types.ObjectId) {
  return MembershipModel.findOne({ userId });
}

export async function requireMember(request: Request) {
  const user = await requireUser(request);
  const membership = await membershipFor(user._id);
  if (!membership) throw new ServiceError(403, "FORBIDDEN", "NO_WEDDING", "Create the wedding first.");
  return { user, membership, weddingId: membership.weddingId };
}

export async function requireAdmin(request: Request) {
  const context = await requireMember(request);
  if (context.membership.role !== "admin") {
    throw new ServiceError(403, "FORBIDDEN", "NOT_ADMIN", "Only an Admin can do that.");
  }
  return context;
}

export function limitReached(message: string): never {
  throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", message);
}
