import "server-only";

import mongoose from "mongoose";
import { z } from "zod";

import { publicAppUrl } from "@/config/env";
import { resolveTheme } from "@/data/worlds";
import { assertId, emailField, idOf, limitReached, notFound, objectId, optionalText, requireMember } from "@/modules/access";
import { assertEventsOnWedding, presentEvent } from "@/modules/events/service";
import { embedUrl } from "@/modules/website/embed";
import { randomToken } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/connection";
import { EmailJobModel, EventModel, HouseholdModel, RsvpModel, WeddingModel } from "@/server/db/schemas";
import { EmailDeliveryError, sendHouseholdInvitation } from "@/server/email/service";
import type { WeddingDoc } from "@/server/db/documents";
import { ServiceError } from "@/server/http/handle";
import { consumeRateLimit } from "@/server/http/rate-limit";

const SIDES = ["bride", "groom", "other"] as const;

/** Indian mobile numbers become +91XXXXXXXXXX. Other numbers keep their country code. */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (trimmed.startsWith("+")) {
    if (digits.length < 8 || digits.length > 15) return "invalid";
    return `+${digits}`;
  }
  const local = digits.replace(/^0+/, "");
  if (local.length === 10) return `+91${local}`;
  if (local.length === 12 && local.startsWith("91")) return `+${local}`;
  return "invalid";
}

function phoneOrThrow(raw: string | null | undefined) {
  const phone = normalisePhone(raw);
  if (phone === "invalid") {
    throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_PHONE", "Use a 10-digit mobile number, or a number with its country code.", { path: "phone" });
  }
  return phone;
}

function emailOrThrow(raw: string | null | undefined) {
  if (!raw) return null;
  const parsed = emailField.safeParse(raw);
  if (!parsed.success) throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_EMAIL", "Enter a valid email address.", { path: "email" });
  return parsed.data;
}

type RsvpRow = { householdId: unknown; eventId: unknown; status: "yes" | "no"; attendingCount: number; diet: { veg: number; nonVeg: number; jain: number }; respondedAt: Date };

function presentHousehold(
  row: { _id: unknown; name: string; side: string; maxPeople: number; invitedEventIds: unknown[]; email?: string | null; phone?: string | null; notes?: string | null; invitationEmailSentAt?: Date | null; createdAt: Date },
  replies: RsvpRow[],
  lastReminderAt: Date | null,
) {
  const answered = new Map(replies.map((reply) => [idOf(reply.eventId), reply]));
  return {
    id: idOf(row._id),
    name: row.name,
    side: row.side,
    maxPeople: row.maxPeople,
    invitedEventIds: row.invitedEventIds.map(idOf),
    email: row.email ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    invitationEmailSentAt: row.invitationEmailSentAt ? row.invitationEmailSentAt.toISOString() : null,
    lastReminderAt: lastReminderAt ? lastReminderAt.toISOString() : null,
    rsvps: row.invitedEventIds.map((eventId) => {
      const reply = answered.get(idOf(eventId));
      if (!reply) return { eventId: idOf(eventId), status: "silent" as const };
      return {
        eventId: idOf(eventId),
        status: reply.status,
        attendingCount: reply.attendingCount,
        diet: { veg: reply.diet.veg, nonVeg: reply.diet.nonVeg, jain: reply.diet.jain },
        respondedAt: reply.respondedAt.toISOString(),
      };
    }),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listHouseholds(request: Request) {
  const { weddingId } = await requireMember(request);
  const [rows, replies, reminders] = await Promise.all([
    HouseholdModel.find({ weddingId }).sort({ nameSearch: 1 }),
    RsvpModel.find({ weddingId }),
    EmailJobModel.aggregate<{ _id: mongoose.Types.ObjectId; at: Date }>([
      { $match: { weddingId, status: "SENT" } },
      { $group: { _id: "$householdId", at: { $max: "$sentAt" } } },
    ]),
  ]);
  const byHousehold = new Map<string, RsvpRow[]>();
  for (const reply of replies) {
    const key = idOf(reply.householdId);
    byHousehold.set(key, [...(byHousehold.get(key) ?? []), reply]);
  }
  const lastReminder = new Map(reminders.map((row) => [idOf(row._id), row.at]));
  return {
    items: rows.map((row) => presentHousehold(row, byHousehold.get(idOf(row._id)) ?? [], lastReminder.get(idOf(row._id)) ?? null)),
  };
}

const householdFields = {
  name: z.string().trim().min(1).max(100),
  side: z.enum(SIDES),
  maxPeople: z.number().int().min(1).max(25),
  invitedEventIds: z.array(objectId).max(30),
  email: optionalText(200),
  phone: optionalText(30),
  notes: optionalText(1000),
};

const createSchema = z.object(householdFields).strict();
const updateSchema = z.object(householdFields).partial().strict();

export async function createHousehold(request: Request, body: unknown) {
  const { user, weddingId } = await requireMember(request);
  const input = createSchema.parse(body);
  const count = await HouseholdModel.countDocuments({ weddingId });
  if (count >= 2000) limitReached("This wedding already has 2,000 households.");
  const invited = [...new Set(input.invitedEventIds)];
  await assertEventsOnWedding(weddingId, invited, "invitedEventIds");
  const email = emailOrThrow(input.email);
  const phone = phoneOrThrow(input.phone);
  const row = await HouseholdModel.create({
    weddingId,
    name: input.name,
    nameSearch: input.name.toLowerCase(),
    side: input.side,
    maxPeople: input.maxPeople,
    invitedEventIds: invited,
    inviteToken: randomToken(),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    createdBy: user._id,
    schemaVersion: 1,
  });
  return presentHousehold(row, [], null);
}

export async function updateHousehold(request: Request, householdId: string, body: unknown, confirm: boolean) {
  const { weddingId } = await requireMember(request);
  assertId(householdId, "household");
  const input = updateSchema.parse(body);
  const row = await HouseholdModel.findOne({ _id: householdId, weddingId });
  if (!row) notFound("household");
  const replies = await RsvpModel.find({ weddingId, householdId: row._id });

  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  let dropped: string[] = [];
  if (input.name !== undefined) {
    set.name = input.name;
    set.nameSearch = input.name.toLowerCase();
  }
  if (input.side !== undefined) set.side = input.side;
  if (input.maxPeople !== undefined) {
    const most = Math.max(0, ...replies.map((reply) => reply.attendingCount));
    if (input.maxPeople < most) {
      throw new ServiceError(409, "CONFLICT", "MAX_BELOW_ATTENDING", `They already said ${most} are coming. Ask them to change the reply first, or keep the max at ${most} or more.`);
    }
    set.maxPeople = input.maxPeople;
  }
  if (input.invitedEventIds !== undefined) {
    const invited = [...new Set(input.invitedEventIds)];
    await assertEventsOnWedding(weddingId, invited, "invitedEventIds");
    dropped = replies.map((reply) => idOf(reply.eventId)).filter((eventId) => !invited.includes(eventId));
    if (dropped.length > 0 && !confirm) {
      throw new ServiceError(409, "CONFLICT", "CONFIRMATION_REQUIRED", "They already replied for a function you are removing. Their reply for it will be removed.", { rsvpsRemoved: dropped.length });
    }
    set.invitedEventIds = invited;
  }
  for (const field of ["email", "phone", "notes"] as const) {
    if (input[field] === undefined) continue;
    const value = field === "email" ? emailOrThrow(input.email) : field === "phone" ? phoneOrThrow(input.phone) : input.notes;
    if (value) set[field] = value;
    else unset[field] = "";
  }
  await HouseholdModel.updateOne({ _id: row._id }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  if (dropped.length > 0) await RsvpModel.deleteMany({ householdId: row._id, eventId: { $in: dropped } });
  const fresh = await HouseholdModel.findById(row._id);
  if (!fresh) notFound("household");
  return presentHousehold(fresh, await RsvpModel.find({ householdId: row._id }), null);
}

export async function deleteHousehold(request: Request, householdId: string) {
  const { weddingId } = await requireMember(request);
  assertId(householdId, "household");
  const row = await HouseholdModel.findOneAndDelete({ _id: householdId, weddingId });
  if (!row) notFound("household");
  await RsvpModel.deleteMany({ householdId: row._id });
  await EmailJobModel.updateMany({ householdId: row._id, status: "PENDING" }, { $set: { status: "SKIPPED", lastError: "HOUSEHOLD_DELETED" } });
}

function longDate(instant: Date) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(instant);
}

function clock(instant: Date) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(instant).replace(" ", " ").toLowerCase();
}

export type ShareKind = "invite" | "please_rsvp" | "see_you_soon";

export function shareMessage(input: {
  kind: ShareKind;
  couple: string;
  householdName: string;
  inviteUrl: string;
  event?: { title: string; startsAt: Date; venue?: { name?: string | null; city?: string | null } | null } | null;
}) {
  if (input.kind === "please_rsvp" && input.event) {
    return [
      `Namaste ${input.householdName},`,
      "",
      `A gentle reminder from ${input.couple}: please tell us if you can join the ${input.event.title} on ${longDate(input.event.startsAt)}.`,
      "",
      `It takes a minute, no account needed:`,
      input.inviteUrl,
      "",
      "With love,",
      "The families",
    ].join("\n");
  }
  if (input.kind === "see_you_soon" && input.event) {
    const venue = [input.event.venue?.name, input.event.venue?.city].filter(Boolean).join(", ");
    return [
      `${input.householdName}, see you at the ${input.event.title}!`,
      "",
      `${longDate(input.event.startsAt)} at ${clock(input.event.startsAt)}${venue ? ` · ${venue}` : ""}.`,
      "",
      "Your invitation has the map and the helplines:",
      input.inviteUrl,
      "",
      `With love,`,
      `${input.couple} and the families`,
    ].join("\n");
  }
  return [
    `You're invited to ${input.couple}'s wedding.`,
    "",
    "You're invited through The Wedding Home. Open this link to see your functions and RSVP:",
    input.inviteUrl,
    "",
    "With love,",
    "The families",
  ].join("\n");
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const digits = phone ? phone.replace(/[^\d]/g, "") : "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export async function shareHousehold(request: Request, householdId: string, kind: ShareKind = "invite", eventId?: string | null) {
  const { weddingId } = await requireMember(request);
  assertId(householdId, "household");
  await consumeRateLimit("household-email", idOf(weddingId), 500, 24 * 60 * 60 * 1000);
  const row = await HouseholdModel.findOne({ _id: householdId, weddingId });
  if (!row) notFound("household");
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  let event: { title: string; startsAt: Date; venue?: { name?: string | null; city?: string | null } | null } | null = null;
  if (kind !== "invite") {
    if (!eventId || !objectId.safeParse(eventId).success) {
      throw new ServiceError(400, "VALIDATION_ERROR", "EVENT_REQUIRED", "Choose the function for this reminder.", { path: "eventId" });
    }
    event = await EventModel.findOne({ _id: eventId, weddingId });
    if (!event) notFound("function");
  }
  const inviteUrl = `${publicAppUrl()}/i/${row.inviteToken}`;
  const couple = wedding.title || `${wedding.brideName} & ${wedding.groomName}`;
  const message = shareMessage({ kind, couple, householdName: row.name, inviteUrl, event });
  return { inviteUrl, message, waUrl: whatsappUrl(row.phone, message) };
}

export async function sendHouseholdEmail(request: Request, householdId: string) {
  const { weddingId } = await requireMember(request);
  await consumeRateLimit("household-email", idOf(weddingId), 500, 24 * 60 * 60 * 1000);
  assertId(householdId, "household");
  const row = await HouseholdModel.findOne({ _id: householdId, weddingId });
  if (!row) notFound("household");
  if (!row.email) throw new ServiceError(409, "CONFLICT", "NO_EMAIL", "Add an email address before sending.");
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
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
  await HouseholdModel.updateOne({ _id: row._id }, { $set: { invitationEmailSentAt: sentAt } });
  return { invitationEmailSentAt: sentAt.toISOString() };
}

/* ---------- Guest side: the personal invitation ---------- */

type InviteEvent = ReturnType<typeof presentEvent> & {
  theme: ReturnType<typeof resolveTheme>;
  attending: { total: number };
  rsvp: { status: "silent" } | { status: "yes" | "no"; attendingCount: number; diet: { veg: number; nonVeg: number; jain: number } };
};

export type InvitePayload = {
  preview: boolean;
  wedding: {
    brideName: string;
    groomName: string;
    title: string | null;
    weddingDate: string;
    city: string;
    story: string | null;
    packId: string;
    helplines: Array<{ side: "bride" | "groom"; name: string; phone: string }>;
    aashirwad: Array<{ id: string; author: string; relation: string | null; message: string }>;
    giftNote: string | null;
    liveEmbed: string | null;
    siteUrl: string | null;
  };
  household: { name: string; maxPeople: number };
  events: InviteEvent[];
  galleryUrl: string | null;
};

type WeddingRow = WeddingDoc & { _id: unknown };

export function weddingForGuests(wedding: WeddingRow): InvitePayload["wedding"] {
  const site = wedding.site;
  return {
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    weddingDate: wedding.weddingDate,
    city: wedding.city,
    story: wedding.story ?? null,
    packId: site?.theme?.packId ?? "classical",
    helplines: (site?.helplines ?? []).filter((line) => line.name && line.phone).map((line) => ({ side: line.side, name: line.name, phone: line.phone })),
    aashirwad: (site?.aashirwad ?? []).map((entry) => ({ id: idOf(entry._id), author: entry.author, relation: entry.relation ?? null, message: entry.message })),
    giftNote: site?.giftNote ?? null,
    liveEmbed: embedUrl(site?.liveUrl),
    siteUrl: site?.published && site.slug ? `/w/${site.slug}` : null,
  };
}

export async function readPublicInvite(token: string): Promise<InvitePayload | null> {
  await connectToDatabase();
  if (!token || token.length < 20 || token.length > 200) return null;
  const row = await HouseholdModel.findOne({ inviteToken: token });
  if (!row) return null;
  const wedding = await WeddingModel.findById(row.weddingId);
  if (!wedding) return null;
  const [events, mine, totals] = await Promise.all([
    EventModel.find({ _id: { $in: row.invitedEventIds }, weddingId: wedding._id }).sort({ startsAt: 1 }),
    RsvpModel.find({ householdId: row._id }),
    RsvpModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { weddingId: wedding._id, eventId: { $in: row.invitedEventIds }, status: "yes" } },
      { $group: { _id: "$eventId", total: { $sum: "$attendingCount" } } },
    ]),
  ]);
  const answered = new Map(mine.map((reply) => [idOf(reply.eventId), reply]));
  const attending = new Map(totals.map((item) => [idOf(item._id), item.total]));
  const packId = wedding.site?.theme?.packId ?? "classical";
  return {
    preview: false,
    wedding: weddingForGuests(wedding),
    household: { name: row.name, maxPeople: row.maxPeople },
    events: events.map((event) => {
      const reply = answered.get(idOf(event._id));
      return {
        ...presentEvent(event),
        theme: resolveTheme(packId, event.kind, event.themeOverride),
        attending: { total: attending.get(idOf(event._id)) ?? 0 },
        rsvp: reply
          ? { status: reply.status, attendingCount: reply.attendingCount, diet: { veg: reply.diet.veg, nonVeg: reply.diet.nonVeg, jain: reply.diet.jain } }
          : { status: "silent" as const },
      };
    }),
    galleryUrl: wedding.gallery.enabled === false ? null : `/g/${wedding.gallery.token}`,
  };
}

/** The organiser's preview: a made-up household invited to every function, all silent. */
export async function readPreviewInvite(request: Request): Promise<InvitePayload> {
  const { weddingId } = await requireMember(request);
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  const [events, totals] = await Promise.all([
    EventModel.find({ weddingId }).sort({ startsAt: 1 }),
    RsvpModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { weddingId, status: "yes" } },
      { $group: { _id: "$eventId", total: { $sum: "$attendingCount" } } },
    ]),
  ]);
  const attending = new Map(totals.map((item) => [idOf(item._id), item.total]));
  const packId = wedding.site?.theme?.packId ?? "classical";
  return {
    preview: true,
    wedding: weddingForGuests(wedding),
    household: { name: "Preview family", maxPeople: 4 },
    events: events.map((event) => ({
      ...presentEvent(event),
      theme: resolveTheme(packId, event.kind, event.themeOverride),
      attending: { total: attending.get(idOf(event._id)) ?? 0 },
      rsvp: { status: "silent" as const },
    })),
    galleryUrl: wedding.gallery.enabled === false ? null : `/g/${wedding.gallery.token}`,
  };
}

const dietSchema = z.object({ veg: z.number().int().min(0).max(25), nonVeg: z.number().int().min(0).max(25), jain: z.number().int().min(0).max(25) }).strict();

const rsvpSchema = z.object({
  responses: z.array(
    z.object({
      eventId: objectId,
      status: z.enum(["yes", "no"]),
      attendingCount: z.number().int().min(0).max(25).optional(),
      diet: dietSchema.optional(),
    }).strict(),
  ).min(1).max(30),
}).strict();

type FieldError = { path: string; reason: string; message: string };

export function checkRsvp(input: z.infer<typeof rsvpSchema>, invited: string[], maxPeople: number) {
  const errors: FieldError[] = [];
  const seen = new Set<string>();
  input.responses.forEach((item, index) => {
    const path = `responses.${index}`;
    if (!invited.includes(item.eventId)) errors.push({ path: `${path}.eventId`, reason: "EVENT_NOT_INVITED", message: "That function is not on this invitation." });
    if (seen.has(item.eventId)) errors.push({ path: `${path}.eventId`, reason: "DUPLICATE_EVENT", message: "Answer each function once." });
    seen.add(item.eventId);
    if (item.status === "yes") {
      const count = item.attendingCount ?? 0;
      const diet = item.diet ?? { veg: 0, nonVeg: 0, jain: 0 };
      if (count < 1) errors.push({ path: `${path}.attendingCount`, reason: "RSVP_EMPTY", message: "Say how many of you are coming." });
      if (count > maxPeople) errors.push({ path: `${path}.attendingCount`, reason: "RSVP_OVER_MAX", message: `This invitation is for up to ${maxPeople}.` });
      if (diet.veg + diet.nonVeg + diet.jain !== count) errors.push({ path: `${path}.diet`, reason: "DIET_MISMATCH", message: "Veg, non-veg, and Jain must add up to the people coming." });
    }
  });
  return errors;
}

async function answersFor(token: string) {
  const payload = await readPublicInvite(token);
  if (!payload) notFound("invitation");
  return payload.events.map((event) => ({ eventId: event.id, ...event.rsvp }));
}

export async function savePublicRsvp(token: string, body: unknown) {
  await connectToDatabase();
  const input = rsvpSchema.parse(body);
  const row = await HouseholdModel.findOne({ inviteToken: token });
  if (!row) notFound("invitation");
  const invited = row.invitedEventIds.map(idOf);
  const errors = checkRsvp(input, invited, row.maxPeople);
  if (errors.length > 0) {
    const first = errors[0];
    throw new ServiceError(400, "VALIDATION_ERROR", first.reason, first.message, { errors });
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await HouseholdModel.findOne({ _id: row._id }, null, { session });
      if (!current) notFound("invitation");
      const most = Math.max(0, ...input.responses.map((item) => (item.status === "yes" ? item.attendingCount ?? 0 : 0)));
      if (most > current.maxPeople) {
        throw new ServiceError(409, "CONFLICT", "MAX_CHANGED", `The family changed this invitation to ${current.maxPeople} people. Check the numbers and send again.`);
      }
      const now = new Date();
      await RsvpModel.bulkWrite(
        input.responses.map((item) => ({
          updateOne: {
            filter: { householdId: row._id, eventId: new mongoose.Types.ObjectId(item.eventId) },
            update: {
              $set: {
                weddingId: row.weddingId,
                status: item.status,
                attendingCount: item.status === "yes" ? item.attendingCount ?? 0 : 0,
                diet: item.status === "yes" && item.diet ? item.diet : { veg: 0, nonVeg: 0, jain: 0 },
                schemaVersion: 1,
              },
              $setOnInsert: { respondedAt: now },
            },
            upsert: true,
          },
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return { events: await answersFor(token) };
}

/** Same validation as a real reply, and nothing is written. */
export async function checkPreviewRsvp(request: Request, body: unknown) {
  const { weddingId } = await requireMember(request);
  const input = rsvpSchema.parse(body);
  const events = await EventModel.find({ weddingId }, { _id: 1 });
  const errors = checkRsvp(input, events.map((event) => idOf(event._id)), 4);
  if (errors.length > 0) throw new ServiceError(400, "VALIDATION_ERROR", errors[0].reason, errors[0].message, { errors });
  return { events: input.responses.map((item) => ({ eventId: item.eventId, status: item.status, attendingCount: item.attendingCount ?? 0, diet: item.diet ?? { veg: 0, nonVeg: 0, jain: 0 } })) };
}
