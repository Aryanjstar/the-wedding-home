import "server-only";

import mongoose from "mongoose";
import { z } from "zod";

import { assertId, idOf, limitReached, notFound, optionalText, requireMember } from "@/modules/access";
import {
  EmailJobModel,
  EventModel,
  ExpenseModel,
  GalleryModel,
  HouseholdModel,
  RsvpModel,
  TaskModel,
  VendorModel,
} from "@/server/db/schemas";
import type { EventDoc } from "@/server/db/documents";
import { ServiceError } from "@/server/http/handle";

export const EVENT_KINDS = ["roka", "engagement", "mehendi", "haldi", "sangeet", "cocktail", "wedding", "reception", "custom"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export function kindFromTitle(title: string): EventKind {
  const key = title.trim().toLowerCase();
  if ((EVENT_KINDS as readonly string[]).includes(key)) return key as EventKind;
  if (/phera|vivah|shaadi|lagan|nikah|anand karaj/.test(key)) return "wedding";
  if (/mehndi|mehendi|henna/.test(key)) return "mehendi";
  if (/haldi|pithi|ubtan/.test(key)) return "haldi";
  if (/sangeet|garba|dandiya/.test(key)) return "sangeet";
  if (/reception|walima/.test(key)) return "reception";
  if (/engage|sagai|ring/.test(key)) return "engagement";
  if (/cocktail/.test(key)) return "cocktail";
  return "custom";
}

type Venue = { name?: string | null; address?: string | null; city?: string | null } | null | undefined;

/** A place to put a pin: a venue name or an address. A city alone is not a venue. */
export function venueQuery(venue: Venue) {
  if (!venue || !(venue.name || venue.address)) return null;
  const query = [venue.name, venue.address, venue.city].filter(Boolean).join(", ");
  return query || null;
}

export function mapsUrl(venue: Venue) {
  const query = venueQuery(venue);
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

/** A keyless Google Maps embed. Tapping the pin or the link opens Google Maps at the same place. */
export function mapEmbedUrl(venue: Venue) {
  const query = venueQuery(venue);
  return query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed` : null;
}

type EventRow = Pick<EventDoc, "kind" | "title" | "startsAt" | "endsAt" | "isPrimary" | "muhuratAt" | "venue" | "description" | "dressNote" | "howToReach" | "parking" | "themeOverride"> & { _id: unknown };

export function presentEvent(event: EventRow) {
  const hasVenue = Boolean(event.venue?.name || event.venue?.address || event.venue?.city);
  return {
    id: idOf(event._id),
    kind: event.kind,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    isPrimary: event.isPrimary,
    muhuratAt: event.muhuratAt ? event.muhuratAt.toISOString() : null,
    venue: hasVenue
      ? {
          name: event.venue?.name ?? null,
          address: event.venue?.address ?? null,
          city: event.venue?.city ?? null,
          mapsUrl: mapsUrl(event.venue),
          embedUrl: mapEmbedUrl(event.venue),
        }
      : null,
    description: event.description ?? null,
    dressNote: event.dressNote ?? null,
    howToReach: event.howToReach ?? null,
    parking: event.parking ?? null,
    themeOverride: event.themeOverride?.world || event.themeOverride?.accent || event.themeOverride?.music
      ? { world: event.themeOverride.world ?? null, accent: event.themeOverride.accent ?? null, music: event.themeOverride.music ?? null }
      : null,
  };
}

export type Attendance = {
  invited: number;
  silent: number;
  no: number;
  yes: { households: number; attending: number; diet: { veg: number; nonVeg: number; jain: number } };
};

/** Invited, silent, no, and yes with the caterer's diet totals, per function, for one wedding. */
export async function attendanceByEvent(weddingId: mongoose.Types.ObjectId): Promise<Map<string, Attendance>> {
  const [invited, answers] = await Promise.all([
    HouseholdModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { weddingId } },
      { $unwind: "$invitedEventIds" },
      { $group: { _id: "$invitedEventIds", count: { $sum: 1 } } },
    ]),
    RsvpModel.aggregate<{ _id: { eventId: mongoose.Types.ObjectId; status: "yes" | "no" }; households: number; attending: number; veg: number; nonVeg: number; jain: number }>([
      { $match: { weddingId } },
      {
        $group: {
          _id: { eventId: "$eventId", status: "$status" },
          households: { $sum: 1 },
          attending: { $sum: "$attendingCount" },
          veg: { $sum: "$diet.veg" },
          nonVeg: { $sum: "$diet.nonVeg" },
          jain: { $sum: "$diet.jain" },
        },
      },
    ]),
  ]);
  const result = new Map<string, Attendance>();
  const entry = (key: string) => {
    let value = result.get(key);
    if (!value) {
      value = { invited: 0, silent: 0, no: 0, yes: { households: 0, attending: 0, diet: { veg: 0, nonVeg: 0, jain: 0 } } };
      result.set(key, value);
    }
    return value;
  };
  for (const row of invited) entry(idOf(row._id)).invited = row.count;
  for (const row of answers) {
    const value = entry(idOf(row._id.eventId));
    if (row._id.status === "no") value.no = row.households;
    else value.yes = { households: row.households, attending: row.attending, diet: { veg: row.veg, nonVeg: row.nonVeg, jain: row.jain } };
  }
  for (const value of result.values()) value.silent = Math.max(0, value.invited - value.no - value.yes.households);
  return result;
}

const empty: Attendance = { invited: 0, silent: 0, no: 0, yes: { households: 0, attending: 0, diet: { veg: 0, nonVeg: 0, jain: 0 } } };

export async function listEvents(request: Request) {
  const { weddingId } = await requireMember(request);
  const [events, attendance] = await Promise.all([
    EventModel.find({ weddingId }).sort({ startsAt: 1 }),
    attendanceByEvent(weddingId),
  ]);
  return {
    items: events.map((event) => {
      const totals = attendance.get(idOf(event._id)) ?? empty;
      return { ...presentEvent(event), householdsInvited: totals.invited, attendance: totals };
    }),
  };
}

export async function readEvent(request: Request, eventId: string) {
  const { weddingId } = await requireMember(request);
  assertId(eventId, "function");
  const event = await EventModel.findOne({ _id: eventId, weddingId });
  if (!event) notFound("function");
  const attendance = await attendanceByEvent(weddingId);
  const totals = attendance.get(eventId) ?? empty;
  return { ...presentEvent(event), householdsInvited: totals.invited, attendance: totals };
}

const iso = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Use a date and time.");

const venueSchema = z.object({
  name: optionalText(120),
  address: optionalText(300),
  city: optionalText(80),
}).strict();

const eventFields = {
  kind: z.enum(EVENT_KINDS).optional(),
  title: z.string().trim().min(1).max(120),
  startsAt: iso,
  endsAt: iso.nullable().optional(),
  isPrimary: z.boolean().optional(),
  muhuratAt: iso.nullable().optional(),
  venue: venueSchema.nullable().optional(),
  description: optionalText(600),
  dressNote: optionalText(300),
  howToReach: optionalText(300),
  parking: optionalText(300),
};

const createSchema = z.object(eventFields).strict();
const updateSchema = z.object(eventFields).partial().strict();

function cleanVenue(venue: z.infer<typeof venueSchema> | null | undefined) {
  if (!venue) return null;
  const clean = { name: venue.name ?? undefined, address: venue.address ?? undefined, city: venue.city ?? undefined };
  return clean.name || clean.address || clean.city ? clean : null;
}

function checkTimes(startsAt: Date, endsAt: Date | null | undefined) {
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ENDS_BEFORE_START", "The end time must be after the start.");
  }
}

function checkMuhurat(isPrimary: boolean, muhuratAt: Date | null | undefined) {
  if (muhuratAt && !isPrimary) {
    throw new ServiceError(400, "VALIDATION_ERROR", "MUHURAT_NOT_PRIMARY", "Muhurat belongs on the primary function. Tick “Primary wedding date” first.");
  }
}

async function withTransaction<T>(work: (session: mongoose.ClientSession) => Promise<T>) {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}

export async function createEvent(request: Request, body: unknown) {
  const { weddingId } = await requireMember(request);
  const input = createSchema.parse(body);
  const count = await EventModel.countDocuments({ weddingId });
  if (count >= 30) limitReached("This wedding already has 30 functions.");
  const isPrimary = Boolean(input.isPrimary);
  const startsAt = new Date(input.startsAt);
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const muhuratAt = input.muhuratAt ? new Date(input.muhuratAt) : null;
  checkTimes(startsAt, endsAt);
  checkMuhurat(isPrimary, muhuratAt);
  const venue = cleanVenue(input.venue);

  const id = await withTransaction(async (session) => {
    if (isPrimary) await EventModel.updateMany({ weddingId, isPrimary: true }, { $set: { isPrimary: false }, $unset: { muhuratAt: "" } }, { session });
    const [event] = await EventModel.create(
      [{
        weddingId,
        kind: input.kind ?? kindFromTitle(input.title),
        title: input.title,
        startsAt,
        ...(endsAt ? { endsAt } : {}),
        isPrimary,
        ...(muhuratAt ? { muhuratAt } : {}),
        ...(venue ? { venue } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.dressNote ? { dressNote: input.dressNote } : {}),
        ...(input.howToReach ? { howToReach: input.howToReach } : {}),
        ...(input.parking ? { parking: input.parking } : {}),
        schemaVersion: 1,
      }],
      { session },
    );
    return idOf(event._id);
  });
  return readEvent(request, id);
}

export async function updateEvent(request: Request, eventId: string, body: unknown) {
  const { weddingId } = await requireMember(request);
  assertId(eventId, "function");
  const input = updateSchema.parse(body);
  const event = await EventModel.findOne({ _id: eventId, weddingId });
  if (!event) notFound("function");

  const startsAt = input.startsAt ? new Date(input.startsAt) : event.startsAt;
  const endsAt = input.endsAt === undefined ? event.endsAt : input.endsAt ? new Date(input.endsAt) : null;
  const isPrimary = input.isPrimary ?? event.isPrimary;
  const muhuratAt = input.muhuratAt === undefined ? (isPrimary ? event.muhuratAt : null) : input.muhuratAt ? new Date(input.muhuratAt) : null;
  checkTimes(startsAt, endsAt);
  checkMuhurat(isPrimary, muhuratAt);

  const set: Record<string, unknown> = { startsAt, isPrimary };
  const unset: Record<string, ""> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.kind !== undefined) set.kind = input.kind;
  else if (input.title !== undefined && event.kind === "custom") set.kind = kindFromTitle(input.title);
  if (endsAt) set.endsAt = endsAt;
  else unset.endsAt = "";
  if (muhuratAt) set.muhuratAt = muhuratAt;
  else unset.muhuratAt = "";
  if (input.venue !== undefined) {
    const venue = cleanVenue(input.venue);
    if (venue) set.venue = venue;
    else unset.venue = "";
  }
  for (const field of ["description", "dressNote", "howToReach", "parking"] as const) {
    if (input[field] === undefined) continue;
    if (input[field]) set[field] = input[field];
    else unset[field] = "";
  }

  await withTransaction(async (session) => {
    if (isPrimary && !event.isPrimary) {
      await EventModel.updateMany({ weddingId, isPrimary: true }, { $set: { isPrimary: false }, $unset: { muhuratAt: "" } }, { session });
    }
    await EventModel.updateOne({ _id: event._id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { session });
  });
  return readEvent(request, eventId);
}

export async function deleteEvent(request: Request, eventId: string, confirm: boolean) {
  const { weddingId } = await requireMember(request);
  assertId(eventId, "function");
  const event = await EventModel.findOne({ _id: eventId, weddingId });
  if (!event) notFound("function");
  const [householdsInvited, rsvps] = await Promise.all([
    HouseholdModel.countDocuments({ weddingId, invitedEventIds: event._id }),
    RsvpModel.countDocuments({ weddingId, eventId: event._id }),
  ]);
  if (householdsInvited > 0 && !confirm) {
    throw new ServiceError(
      409,
      "CONFLICT",
      "CONFIRMATION_REQUIRED",
      `${householdsInvited} ${householdsInvited === 1 ? "household is" : "households are"} invited to ${event.title}. Removing it also removes their replies for it.`,
      { householdsInvited, rsvps },
    );
  }
  await withTransaction(async (session) => {
    await EventModel.deleteOne({ _id: event._id }, { session });
    await HouseholdModel.updateMany({ weddingId }, { $pull: { invitedEventIds: event._id } }, { session });
    await RsvpModel.deleteMany({ weddingId, eventId: event._id }, { session });
    await TaskModel.updateMany({ weddingId, eventId: event._id }, { $unset: { eventId: "" } }, { session });
    await ExpenseModel.updateMany({ weddingId, eventId: event._id }, { $unset: { eventId: "" } }, { session });
    await GalleryModel.updateMany({ weddingId, eventId: event._id }, { $unset: { eventId: "" } }, { session });
    await VendorModel.updateMany({ weddingId }, { $pull: { eventIds: event._id } }, { session });
    await EmailJobModel.updateMany({ weddingId, eventId: event._id, status: "PENDING" }, { $set: { status: "SKIPPED", lastError: "EVENT_DELETED" } }, { session });
  });
}

/** Belongs to this wedding, or a calm validation error naming the field. */
export async function assertEventsOnWedding(weddingId: mongoose.Types.ObjectId, ids: string[], path = "eventId") {
  if (ids.length === 0) return;
  const found = await EventModel.countDocuments({ _id: { $in: ids }, weddingId });
  if (found !== new Set(ids).size) {
    throw new ServiceError(400, "VALIDATION_ERROR", "UNKNOWN_EVENT", "Choose functions on this wedding.", { path });
  }
}
