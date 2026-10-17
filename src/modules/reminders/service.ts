import "server-only";

import mongoose from "mongoose";
import { z } from "zod";

import { assertId, idOf, isDuplicate, notFound, objectId, requireMember } from "@/modules/access";
import { connectToDatabase } from "@/server/db/connection";
import { EmailJobModel, EventModel, HouseholdModel, RsvpModel, WeddingModel } from "@/server/db/schemas";
import { EmailDeliveryError, sendReminder } from "@/server/email/service";
import { ServiceError } from "@/server/http/handle";
import { consumeRateLimit } from "@/server/http/rate-limit";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const WINDOW = 36 * HOUR;
const BATCH = 25;
const SEND_NOW_CAP = 300;

export type ReminderKind = "please_rsvp" | "see_you_soon";
export type Slot = "1m" | "1w" | "1d";

let indexesReady: Promise<unknown> | null = null;

/** The dedupe key must be unique before two runners can race. Built once per process. */
function ensureIndexes() {
  indexesReady ??= EmailJobModel.createIndexes().catch(() => {
    indexesReady = null;
  });
  return indexesReady;
}

/** One calendar month earlier, read in India, at the same clock time. */
export function monthBefore(instant: Date) {
  const india = new Date(instant.getTime() + 5.5 * HOUR);
  const year = india.getUTCFullYear();
  const month = india.getUTCMonth() - 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  india.setUTCFullYear(year, month, Math.min(india.getUTCDate(), lastDay));
  return new Date(india.getTime() - 5.5 * HOUR);
}

export function slotTimes(startsAt: Date): Record<Slot, Date> {
  return {
    "1m": monthBefore(startsAt),
    "1w": new Date(startsAt.getTime() - 7 * DAY),
    "1d": new Date(startsAt.getTime() - DAY),
  };
}

export function slotsFor(kind: ReminderKind): Slot[] {
  return kind === "please_rsvp" ? ["1m", "1w", "1d"] : ["1d"];
}

/** A slot is due inside a 36-hour window, so a missed daily run is forgiven. */
export function dueSlot(kind: ReminderKind, startsAt: Date, now: Date): { slot: Slot; at: Date } | null {
  const times = slotTimes(startsAt);
  for (const slot of slotsFor(kind)) {
    const at = times[slot];
    if (at.getTime() <= now.getTime() && now.getTime() < at.getTime() + WINDOW) return { slot, at };
  }
  return null;
}

function when(instant: Date) {
  const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(instant);
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(instant).replace(" ", " ").toLowerCase();
  return `${day}, ${time}`;
}

async function silentAndYes(weddingId: mongoose.Types.ObjectId, eventId: mongoose.Types.ObjectId) {
  const [households, replies] = await Promise.all([
    HouseholdModel.find({ weddingId, invitedEventIds: eventId }).sort({ nameSearch: 1 }),
    RsvpModel.find({ weddingId, eventId }),
  ]);
  const status = new Map(replies.map((reply) => [idOf(reply.householdId), reply.status]));
  return {
    silent: households.filter((house) => !status.has(idOf(house._id))),
    yes: households.filter((house) => status.get(idOf(house._id)) === "yes"),
  };
}

export async function reminderQueue(request: Request, eventId: string) {
  const { weddingId } = await requireMember(request);
  assertId(eventId, "function");
  const event = await EventModel.findOne({ _id: eventId, weddingId });
  if (!event) notFound("function");
  const { silent, yes } = await silentAndYes(weddingId, event._id);
  const sent = await EmailJobModel.aggregate<{ _id: mongoose.Types.ObjectId; at: Date }>([
    { $match: { weddingId, eventId: event._id, status: "SENT" } },
    { $group: { _id: "$householdId", at: { $max: "$sentAt" } } },
  ]);
  const last = new Map(sent.map((row) => [idOf(row._id), row.at]));
  const now = Date.now();
  const times = slotTimes(event.startsAt);
  const row = (house: (typeof silent)[number]) => ({
    householdId: idOf(house._id),
    name: house.name,
    hasEmail: Boolean(house.email),
    hasPhone: Boolean(house.phone),
    lastReminderAt: last.get(idOf(house._id))?.toISOString() ?? null,
  });
  return {
    event: { id: idOf(event._id), title: event.title, startsAt: event.startsAt.toISOString() },
    schedule: (["1m", "1w", "1d"] as const).map((slot) => ({
      slot,
      dueAt: times[slot].toISOString(),
      state: times[slot].getTime() <= now ? "passed" : "upcoming",
      kinds: slot === "1d" ? ["please_rsvp", "see_you_soon"] : ["please_rsvp"],
    })),
    silent: silent.map(row),
    yes: yes.map(row),
  };
}

type JobTarget = {
  weddingId: mongoose.Types.ObjectId;
  householdId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  kind: ReminderKind;
};

/** Sends one reminder now, if it still applies. Returns the outcome; never throws for a skip. */
async function deliver(target: JobTarget, idempotencyKey: string): Promise<"SENT" | "SKIPPED" | "FAILED"> {
  const [house, event, wedding, reply] = await Promise.all([
    HouseholdModel.findOne({ _id: target.householdId, weddingId: target.weddingId }),
    EventModel.findOne({ _id: target.eventId, weddingId: target.weddingId }),
    WeddingModel.findById(target.weddingId),
    RsvpModel.findOne({ householdId: target.householdId, eventId: target.eventId }),
  ]);
  if (!house || !event || !wedding || !house.email) return "SKIPPED";
  if (!house.invitedEventIds.some((id) => idOf(id) === idOf(event._id))) return "SKIPPED";
  if (target.kind === "please_rsvp" && reply) return "SKIPPED";
  if (target.kind === "see_you_soon" && reply?.status !== "yes") return "SKIPPED";
  try {
    await sendReminder({
      to: house.email,
      kind: target.kind,
      householdName: house.name,
      couple: wedding.title || `${wedding.brideName} & ${wedding.groomName}`,
      eventTitle: event.title,
      when: when(event.startsAt),
      venue: [event.venue?.name, event.venue?.city].filter(Boolean).join(", ") || null,
      invitePath: `/i/${house.inviteToken}`,
      idempotencyKey,
    });
    return "SENT";
  } catch (error) {
    if (error instanceof EmailDeliveryError) return "FAILED";
    throw error;
  }
}

const remindSchema = z.object({ eventId: objectId, kind: z.enum(["please_rsvp", "see_you_soon"]) }).strict();

export async function remindHousehold(request: Request, householdId: string, body: unknown) {
  const { weddingId } = await requireMember(request);
  await connectToDatabase();
  await ensureIndexes();
  assertId(householdId, "household");
  const input = remindSchema.parse(body);
  await consumeRateLimit("household-email", idOf(weddingId), 500, DAY);
  const house = await HouseholdModel.findOne({ _id: householdId, weddingId });
  if (!house) notFound("household");
  if (!house.email) throw new ServiceError(409, "CONFLICT", "NO_EMAIL", "This household has no email. Use WhatsApp instead.");
  const reply = await RsvpModel.findOne({ householdId: house._id, eventId: input.eventId });
  if (input.kind === "please_rsvp" && reply) throw new ServiceError(409, "CONFLICT", "ALREADY_ANSWERED", "They have already replied for this function.");
  const batchId = new mongoose.Types.ObjectId();
  const target = { weddingId, householdId: house._id, eventId: new mongoose.Types.ObjectId(input.eventId), kind: input.kind };
  const outcome = await deliver(target, `reminder/${idOf(batchId)}`);
  if (outcome === "FAILED") throw new ServiceError(503, "INTERNAL_ERROR", "DEPENDENCY_UNAVAILABLE", "The email did not go out. Try again in a moment.");
  if (outcome === "SKIPPED") throw new ServiceError(409, "CONFLICT", "ALREADY_ANSWERED", "This reminder no longer applies.");
  const sentAt = new Date();
  await EmailJobModel.create({
    ...target,
    origin: "send_now",
    dedupeKey: `${householdId}:${input.eventId}:${input.kind}:now:${idOf(batchId)}`,
    batchId,
    status: "SENT",
    runAfter: sentAt,
    attempts: 1,
    sentAt,
    expireAt: new Date(sentAt.getTime() + 30 * DAY),
    schemaVersion: 1,
  });
  return { sentAt: sentAt.toISOString() };
}

const sendNowSchema = z.object({
  eventId: objectId,
  kind: z.enum(["please_rsvp", "see_you_soon"]),
  householdIds: z.array(objectId).max(SEND_NOW_CAP).optional(),
}).strict();

export async function sendNow(request: Request, body: unknown) {
  const { weddingId } = await requireMember(request);
  await connectToDatabase();
  await ensureIndexes();
  const input = sendNowSchema.parse(body);
  const event = await EventModel.findOne({ _id: input.eventId, weddingId });
  if (!event) notFound("function");
  const { silent, yes } = await silentAndYes(weddingId, event._id);
  let targets = input.kind === "please_rsvp" ? silent : yes;
  if (input.householdIds) {
    const wanted = new Set(input.householdIds);
    targets = targets.filter((house) => wanted.has(idOf(house._id)));
  }
  const withEmail = targets.filter((house) => house.email);
  const noEmail = targets.length - withEmail.length;
  if (withEmail.length > SEND_NOW_CAP) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", `Send to ${SEND_NOW_CAP} households at a time.`);
  await consumeRateLimit("household-email", idOf(weddingId), 500, DAY);
  const batchId = new mongoose.Types.ObjectId();
  const now = new Date();
  if (withEmail.length > 0) {
    await EmailJobModel.insertMany(
      withEmail.map((house) => ({
        weddingId,
        kind: input.kind,
        origin: "send_now",
        householdId: house._id,
        eventId: event._id,
        dedupeKey: `${idOf(house._id)}:${idOf(event._id)}:${input.kind}:now:${idOf(batchId)}`,
        batchId,
        status: "PENDING",
        runAfter: now,
        attempts: 0,
        schemaVersion: 1,
      })),
    );
  }
  // Send this batch inside the request so the family sees the result. The daily run retries failures.
  const result = await processJobs({ batchId, limit: SEND_NOW_CAP });
  return { batchId: idOf(batchId), enqueued: withEmail.length, sent: result.sent, failed: result.failed, skipped: { noEmail, other: result.skipped } };
}

export async function batchProgress(request: Request, batchId: string) {
  const { weddingId } = await requireMember(request);
  assertId(batchId, "batch");
  const rows = await EmailJobModel.aggregate<{ _id: string; count: number }>([
    { $match: { weddingId, batchId: new mongoose.Types.ObjectId(batchId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const count = (status: string) => rows.find((row) => row._id === status)?.count ?? 0;
  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    pending: count("PENDING"),
    processing: count("PROCESSING"),
    sent: count("SENT"),
    failed: count("FAILED"),
    skipped: count("SKIPPED"),
  };
}

/** Claim one job atomically: pending, or stuck in processing for 10 minutes. */
async function claim(filter: Record<string, unknown>, now = new Date()) {
  return EmailJobModel.findOneAndUpdate(
    {
      ...filter,
      runAfter: { $lte: now },
      attempts: { $lt: 3 },
      $or: [{ status: "PENDING" }, { status: "PROCESSING", lockedAt: { $lt: new Date(now.getTime() - 10 * 60_000) } }],
    },
    { $set: { status: "PROCESSING", lockedAt: now }, $inc: { attempts: 1 } },
    { sort: { runAfter: 1 }, new: true },
  );
}

export async function processJobs(options: { batchId?: mongoose.Types.ObjectId; limit?: number; now?: Date } = {}) {
  const limit = options.limit ?? BATCH * 8;
  const filter = options.batchId ? { batchId: options.batchId } : {};
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (let index = 0; index < limit; index += 1) {
    const job = await claim(filter, options.now);
    if (!job) break;
    const outcome = await deliver(job, `reminder-job/${idOf(job._id)}`);
    const finalAt = new Date();
    if (outcome === "SENT") {
      sent += 1;
      await EmailJobModel.updateOne({ _id: job._id }, { $set: { status: "SENT", sentAt: finalAt, expireAt: new Date(finalAt.getTime() + 30 * DAY) }, $unset: { lockedAt: "" } });
    } else if (outcome === "SKIPPED") {
      skipped += 1;
      await EmailJobModel.updateOne({ _id: job._id }, { $set: { status: "SKIPPED", lastError: "NO_LONGER_NEEDED", expireAt: new Date(finalAt.getTime() + 30 * DAY) }, $unset: { lockedAt: "" } });
    } else {
      failed += 1;
      const final = job.attempts >= 3;
      await EmailJobModel.updateOne(
        { _id: job._id },
        {
          $set: {
            status: final ? "FAILED" : "PENDING",
            lastError: "RESEND_FAILED",
            runAfter: new Date(finalAt.getTime() + 15 * 60_000),
            ...(final ? { expireAt: new Date(finalAt.getTime() + 30 * DAY) } : {}),
          },
          $unset: { lockedAt: "" },
        },
      );
    }
  }
  return { sent, failed, skipped };
}

/** The scheduled planner: enqueue every reminder whose slot is due now. Repeating it is a no-op. */
export async function planScheduled(now = new Date()) {
  await connectToDatabase();
  await ensureIndexes();
  const horizon = new Date(now.getTime() + 32 * DAY);
  const events = await EventModel.find({ startsAt: { $gt: now, $lte: horizon } });
  let planned = 0;
  for (const event of events) {
    for (const kind of ["please_rsvp", "see_you_soon"] as const) {
      const due = dueSlot(kind, event.startsAt, now);
      if (!due) continue;
      const { silent, yes } = await silentAndYes(event.weddingId, event._id);
      const targets = (kind === "please_rsvp" ? silent : yes).filter((house) => house.email && house.createdAt.getTime() <= due.at.getTime());
      for (const house of targets) {
        try {
          await EmailJobModel.create({
            weddingId: event.weddingId,
            kind,
            origin: "scheduled",
            householdId: house._id,
            eventId: event._id,
            dedupeKey: `${idOf(house._id)}:${idOf(event._id)}:${kind}:${due.slot}`,
            status: "PENDING",
            runAfter: now,
            attempts: 0,
            schemaVersion: 1,
          });
          planned += 1;
        } catch (error) {
          if (!isDuplicate(error)) throw error;
        }
      }
    }
  }
  return { planned };
}

export async function runReminders(now = new Date()) {
  const plan = await planScheduled(now);
  const result = await processJobs({ now });
  return { ...plan, ...result };
}
