import "server-only";

import type mongoose from "mongoose";
import { z } from "zod";

import { assertId, emailField, idOf, isDuplicate, limitReached, notFound, objectId, optionalText, requireMember } from "@/modules/access";
import { assertEventsOnWedding, venueQuery } from "@/modules/events/service";
import { EventModel, ExpenseModel, VendorModel, WeddingModel } from "@/server/db/schemas";
import type { VendorDoc } from "@/server/db/documents";
import { ServiceError } from "@/server/http/handle";
import { consumeRateLimit } from "@/server/http/rate-limit";
import { geocodeFirst, MapsUnavailableError, nearby, placeById } from "@/server/maps/osm";

export const VENDOR_CATEGORIES = ["photographer", "videographer", "venue", "caterer", "decorator", "dj", "makeup", "mehendi_artist", "pandit", "choreographer", "florist", "planner", "transport", "other"] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];


function presentVendor(row: VendorDoc & { _id: unknown }, spent: Map<string, number>) {
  return {
    id: idOf(row._id),
    name: row.name,
    category: row.category,
    contactPerson: row.contactPerson ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    address: row.address ?? null,
    agreedCostInr: row.agreedCostInr ?? null,
    spentInr: spent.get(idOf(row._id)) ?? 0,
    eventIds: (row.eventIds ?? []).map(idOf),
    notes: row.notes ?? null,
    source: row.source,
    placeId: row.place?.id ?? null,
    mapsUrl: row.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.name}, ${row.address}`)}`
        : row.place?.lat !== undefined && row.place?.lat !== null && row.place?.lng !== undefined && row.place?.lng !== null
          ? `https://www.google.com/maps/search/?api=1&query=${row.place.lat},${row.place.lng}`
          : null,
  };
}

async function spentByVendor(weddingId: mongoose.Types.ObjectId) {
  const rows = await ExpenseModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
    { $match: { weddingId, vendorId: { $exists: true } } },
    { $group: { _id: "$vendorId", total: { $sum: "$amountInr" } } },
  ]);
  return new Map(rows.map((row) => [idOf(row._id), row.total]));
}

export async function listVendors(request: Request) {
  const { weddingId } = await requireMember(request);
  const [rows, spent] = await Promise.all([VendorModel.find({ weddingId }).sort({ category: 1, name: 1 }), spentByVendor(weddingId)]);
  return { items: rows.map((row) => presentVendor(row, spent)) };
}

const website = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  })
  .pipe(z.union([z.url().max(300), z.null(), z.undefined()]));

const fields = {
  name: z.string().trim().min(1).max(120),
  category: z.enum(VENDOR_CATEGORIES),
  contactPerson: optionalText(100),
  phone: optionalText(30),
  email: optionalText(200),
  website,
  address: optionalText(300),
  agreedCostInr: z.number().int().min(0).max(1_000_000_000).nullable(),
  eventIds: z.array(objectId).max(30),
  notes: optionalText(1000),
};

const createSchema = z.object({
  ...fields,
  agreedCostInr: fields.agreedCostInr.optional(),
  eventIds: fields.eventIds.optional(),
}).strict();
const updateSchema = z.object(fields).partial().strict();

function checkEmail(value: string | null | undefined) {
  if (!value) return value;
  const parsed = emailField.safeParse(value);
  if (!parsed.success) throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_EMAIL", "Enter a valid email address.", { path: "email" });
  return parsed.data;
}

async function one(weddingId: mongoose.Types.ObjectId, id: string) {
  const row = await VendorModel.findOne({ _id: id, weddingId });
  if (!row) notFound("vendor");
  return presentVendor(row, await spentByVendor(weddingId));
}

export async function createVendor(request: Request, body: unknown) {
  // Saving from the nearby search sends the place; the server copies the fields from Google.
  if (body && typeof body === "object" && "place" in body) return saveVendorFromPlace(request, body);
  const { user, weddingId } = await requireMember(request);
  const input = createSchema.parse(body);
  const count = await VendorModel.countDocuments({ weddingId });
  if (count >= 300) limitReached("This wedding already has 300 vendors.");
  const eventIds = [...new Set(input.eventIds ?? [])];
  await assertEventsOnWedding(weddingId, eventIds, "eventIds");
  const email = checkEmail(input.email);
  const row = await VendorModel.create({
    weddingId,
    name: input.name,
    category: input.category,
    ...(input.contactPerson ? { contactPerson: input.contactPerson } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(email ? { email } : {}),
    ...(input.website ? { website: input.website } : {}),
    ...(input.address ? { address: input.address } : {}),
    ...(typeof input.agreedCostInr === "number" ? { agreedCostInr: input.agreedCostInr } : {}),
    ...(eventIds.length ? { eventIds } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    source: "manual",
    createdBy: user._id,
    schemaVersion: 1,
  });
  return one(weddingId, idOf(row._id));
}

export async function updateVendor(request: Request, vendorId: string, body: unknown) {
  const { weddingId } = await requireMember(request);
  assertId(vendorId, "vendor");
  const input = updateSchema.parse(body);
  const row = await VendorModel.findOne({ _id: vendorId, weddingId });
  if (!row) notFound("vendor");
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.category !== undefined) set.category = input.category;
  if (input.email !== undefined) input.email = checkEmail(input.email);
  for (const field of ["contactPerson", "phone", "email", "website", "address", "notes"] as const) {
    if (input[field] === undefined) continue;
    if (input[field]) set[field] = input[field];
    else unset[field] = "";
  }
  if (input.agreedCostInr !== undefined) {
    if (typeof input.agreedCostInr === "number") set.agreedCostInr = input.agreedCostInr;
    else unset.agreedCostInr = "";
  }
  if (input.eventIds !== undefined) {
    const eventIds = [...new Set(input.eventIds)];
    await assertEventsOnWedding(weddingId, eventIds, "eventIds");
    set.eventIds = eventIds;
  }
  await VendorModel.updateOne({ _id: row._id }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  return one(weddingId, vendorId);
}

export async function deleteVendor(request: Request, vendorId: string) {
  const { weddingId } = await requireMember(request);
  assertId(vendorId, "vendor");
  const row = await VendorModel.findOneAndDelete({ _id: vendorId, weddingId });
  if (!row) notFound("vendor");
  // Expenses keep the name as free text.
  await ExpenseModel.updateMany({ weddingId, vendorId: row._id }, { $set: { vendorLabel: row.name }, $unset: { vendorId: "" } });
}

/* ---------- Nearby search through OpenStreetMap, server side ---------- */

function unavailable(): never {
  throw new ServiceError(503, "INTERNAL_ERROR", "DISCOVERY_UNAVAILABLE", "Nearby search is not available right now. Saved vendors still work, and Open in Google Maps does too.");
}

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}

function googleLink(name: string, where: string | null, point: { lat: number; lng: number }) {
  const query = [name, where].filter(Boolean).join(", ") || `${point.lat},${point.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const searchSchema = z.object({
  eventId: objectId.optional(),
  category: z.enum(VENDOR_CATEGORIES),
  q: z.string().trim().max(80).optional(),
});

export async function searchVendors(request: Request, params: URLSearchParams) {
  const { user, weddingId } = await requireMember(request);
  const input = searchSchema.parse({
    eventId: params.get("eventId") || undefined,
    category: params.get("category") || "photographer",
    q: params.get("q") || undefined,
  });
  await consumeRateLimit("vendor-search", idOf(user._id), 60, 60 * 60 * 1000);
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  let near = wedding.city;
  let centre: { lat: number; lng: number } | null = null;
  let radius = 12_000;
  if (input.eventId) {
    const event = await EventModel.findOne({ _id: input.eventId, weddingId });
    if (!event) notFound("function");
    const city = event.venue?.city ?? wedding.city;
    const place = event.venue?.name ?? event.venue?.address;
    near = place ? (place.toLowerCase().includes(city.toLowerCase()) ? place : `${place}, ${city}`) : city;
    const stored = event.venue?.location?.coordinates;
    centre = stored?.length === 2 ? { lng: stored[0], lat: stored[1] } : await geocodeFirst([venueQuery(event.venue), event.venue?.address && `${event.venue.address}, ${event.venue.city ?? wedding.city}`]);
    radius = 8_000;
  }
  centre ??= await geocodeFirst([`${wedding.city}, India`]);
  if (!centre) throw new ServiceError(400, "VALIDATION_ERROR", "PLACE_NOT_FOUND", `We could not find ${near} on the map. Check the venue or the city.`);
  let places;
  try {
    places = await nearby(centre, input.category, radius, input.q);
    if (places.length < 4) places = await nearby(centre, input.category, radius * 2.5, input.q);
    places = places.filter((place) => distanceM(centre, place) <= radius * 2.5);
  } catch (error) {
    if (error instanceof MapsUnavailableError) unavailable();
    throw error;
  }
  const words = input.q ? input.q.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const ranked = places
    .map((place) => ({ place, distance: distanceM(centre, place), match: words.some((word) => place.name.toLowerCase().includes(word)) }))
    .sort((a, b) => Number(b.match) - Number(a.match) || a.distance - b.distance)
    .slice(0, 24);
  const saved = await VendorModel.find({ weddingId, "place.id": { $in: ranked.map((item) => item.place.id) } }, { "place.id": 1 });
  const savedIds = new Map(saved.map((row) => [row.place?.id ?? "", idOf(row._id)]));
  return {
    near,
    centre,
    attribution: "Map data © OpenStreetMap contributors",
    places: ranked.map(({ place, distance }) => {
      const address = place.address;
      return {
        placeId: place.id,
        name: place.name,
        address,
        phone: place.phone,
        website: place.website,
        lat: place.lat,
        lng: place.lng,
        distanceM: distance,
        mapsUrl: googleLink(place.name, address ?? wedding.city, place),
        osmUrl: `https://www.openstreetmap.org/${place.id}`,
        savedVendorId: savedIds.get(place.id) ?? null,
      };
    }),
  };
}

const saveSchema = z.object({
  place: z.object({ id: z.string().trim().regex(/^(node|way|relation)\/\d{1,15}$/), lat: z.number().optional(), lng: z.number().optional() }).strict(),
  category: z.enum(VENDOR_CATEGORIES),
  eventIds: z.array(objectId).max(30).optional(),
}).strict();

/** Saves a search result. The server reads the place again; the client does not choose what is stored. */
export async function saveVendorFromPlace(request: Request, body: unknown) {
  const { user, weddingId } = await requireMember(request);
  const input = saveSchema.parse(body);
  const count = await VendorModel.countDocuments({ weddingId });
  if (count >= 300) limitReached("This wedding already has 300 vendors.");
  const eventIds = [...new Set(input.eventIds ?? [])];
  await assertEventsOnWedding(weddingId, eventIds, "eventIds");
  if (await VendorModel.exists({ weddingId, "place.id": input.place.id })) {
    throw new ServiceError(409, "CONFLICT", "ALREADY_SAVED", "That vendor is already in My vendors.");
  }
  let place;
  try {
    place = await placeById(input.place.id);
  } catch (error) {
    if (error instanceof MapsUnavailableError) unavailable();
    throw error;
  }
  if (!place) notFound("place");
  const { phone, website, address } = place;
  try {
    const row = await VendorModel.create({
      weddingId,
      name: place.name.slice(0, 120),
      category: input.category,
      ...(phone ? { phone: phone.slice(0, 30) } : {}),
      ...(website ? { website: (/^https?:/i.test(website) ? website : `https://${website}`).slice(0, 300) } : {}),
      ...(address ? { address: address.slice(0, 300) } : {}),
      ...(eventIds.length ? { eventIds } : {}),
      place: { provider: "osm", id: place.id, lat: place.lat, lng: place.lng },
      source: "places",
      createdBy: user._id,
      schemaVersion: 1,
    });
    return one(weddingId, idOf(row._id));
  } catch (error) {
    if (isDuplicate(error)) throw new ServiceError(409, "CONFLICT", "ALREADY_SAVED", "That vendor is already in My vendors.");
    throw error;
  }
}
