import "server-only";

import type mongoose from "mongoose";
import { z } from "zod";

import { assertId, emailField, idOf, isDuplicate, limitReached, notFound, objectId, optionalText, requireMember } from "@/modules/access";
import { assertEventsOnWedding, venueQuery } from "@/modules/events/service";
import { EventModel, ExpenseModel, VendorModel, WeddingModel } from "@/server/db/schemas";
import type { VendorDoc } from "@/server/db/documents";
import { ServiceError } from "@/server/http/handle";
import { consumeRateLimit } from "@/server/http/rate-limit";

export const VENDOR_CATEGORIES = ["photographer", "videographer", "venue", "caterer", "decorator", "dj", "makeup", "mehendi_artist", "pandit", "choreographer", "florist", "planner", "transport", "other"] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

const SEARCH_WORDS: Record<VendorCategory, string> = {
  photographer: "wedding photographer",
  videographer: "wedding videographer",
  venue: "wedding venue banquet hall",
  caterer: "wedding caterer",
  decorator: "wedding decorator",
  dj: "wedding DJ",
  makeup: "bridal makeup artist",
  mehendi_artist: "mehendi artist",
  pandit: "pandit for wedding",
  choreographer: "sangeet choreographer",
  florist: "florist",
  planner: "wedding planner",
  transport: "wedding car rental",
  other: "wedding services",
};

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
    rating: row.place?.rating ?? null,
    googlePlaceId: row.place?.googlePlaceId ?? null,
    mapsUrl: row.place?.googlePlaceId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${row.place.googlePlaceId}`
      : row.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.name}, ${row.address}`)}`
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

/* ---------- Nearby search through Google Places, server side ---------- */

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
};

const FIELDS = "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri";

function placesKey() {
  const key = (process.env.GOOGLE_PLACES_API_KEY ?? "").trim();
  if (!key || key === "replace-me") return null;
  return key;
}

function unavailable(): never {
  throw new ServiceError(503, "INTERNAL_ERROR", "DISCOVERY_UNAVAILABLE", "Nearby search is not available right now. Saved vendors still work, and Open in Google Maps does too.");
}

async function searchText(body: Record<string, unknown>, fieldMask = FIELDS): Promise<Place[]> {
  const key = placesKey();
  if (!key) unavailable();
  let response: Response;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
      body: JSON.stringify({ languageCode: "en", regionCode: "IN", ...body }),
    });
  } catch {
    unavailable();
  }
  if (!response.ok) {
    const reason = ((await response.json().catch(() => null)) as { error?: { status?: string; message?: string } } | null)?.error;
    console.error(JSON.stringify({ operation: "places-search", status: response.status, reason: reason?.status, message: reason?.message?.slice(0, 160) }));
    unavailable();
  }
  const json = (await response.json().catch(() => null)) as { places?: Place[] } | null;
  return json?.places ?? [];
}

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
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
  await consumeRateLimit("places-search", idOf(user._id), 60, 60 * 60 * 1000);
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  let near = wedding.city;
  let centre: { lat: number; lng: number } | null = null;
  if (input.eventId) {
    const event = await EventModel.findOne({ _id: input.eventId, weddingId });
    if (!event) notFound("function");
    const query = venueQuery(event.venue);
    if (query) {
      near = query;
      const [anchor] = await searchText({ textQuery: query, pageSize: 1 }, "places.location");
      if (anchor?.location) centre = { lat: anchor.location.latitude, lng: anchor.location.longitude };
    }
  }
  const words = input.q ? `${input.q} ${SEARCH_WORDS[input.category]}` : SEARCH_WORDS[input.category];
  const places = await searchText({
    textQuery: `${words} near ${near}`,
    pageSize: 12,
    ...(centre ? { locationBias: { circle: { center: { latitude: centre.lat, longitude: centre.lng }, radius: 15000 } } } : {}),
  });
  const saved = await VendorModel.find({ weddingId, "place.googlePlaceId": { $in: places.map((place) => place.id) } }, { "place.googlePlaceId": 1 });
  const savedIds = new Map(saved.map((row) => [row.place?.googlePlaceId ?? "", idOf(row._id)]));
  return {
    near,
    places: places.map((place) => ({
      googlePlaceId: place.id,
      name: place.displayName?.text ?? "Unnamed",
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      address: place.formattedAddress ?? null,
      phone: place.nationalPhoneNumber ?? null,
      website: place.websiteUri ?? null,
      mapsUrl: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text ?? "")}&query_place_id=${place.id}`,
      distanceM: centre && place.location ? distanceM(centre, { lat: place.location.latitude, lng: place.location.longitude }) : null,
      savedVendorId: savedIds.get(place.id) ?? null,
    })),
  };
}

const saveSchema = z.object({
  place: z.object({ googlePlaceId: z.string().trim().min(5).max(300), lat: z.number().optional(), lng: z.number().optional() }).strict(),
  category: z.enum(VENDOR_CATEGORIES),
  eventIds: z.array(objectId).max(30).optional(),
}).strict();

/** Saves a search result. The server refetches the place; the client does not choose what is stored. */
export async function saveVendorFromPlace(request: Request, body: unknown) {
  const { user, weddingId } = await requireMember(request);
  const input = saveSchema.parse(body);
  const key = placesKey();
  if (!key) unavailable();
  const count = await VendorModel.countDocuments({ weddingId });
  if (count >= 300) limitReached("This wedding already has 300 vendors.");
  const eventIds = [...new Set(input.eventIds ?? [])];
  await assertEventsOnWedding(weddingId, eventIds, "eventIds");
  let response: Response;
  try {
    response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(input.place.googlePlaceId)}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,nationalPhoneNumber,websiteUri" },
    });
  } catch {
    unavailable();
  }
  if (response.status === 404 || response.status === 400) notFound("place");
  if (!response.ok) unavailable();
  const place = (await response.json()) as Place;
  if (await VendorModel.exists({ weddingId, "place.googlePlaceId": place.id })) {
    throw new ServiceError(409, "CONFLICT", "ALREADY_SAVED", "That vendor is already in My vendors.");
  }
  try {
    const row = await VendorModel.create({
      weddingId,
      name: (place.displayName?.text ?? "Vendor").slice(0, 120),
      category: input.category,
      ...(place.nationalPhoneNumber ? { phone: place.nationalPhoneNumber.slice(0, 30) } : {}),
      ...(place.websiteUri ? { website: place.websiteUri.slice(0, 300) } : {}),
      ...(place.formattedAddress ? { address: place.formattedAddress.slice(0, 300) } : {}),
      ...(eventIds.length ? { eventIds } : {}),
      place: { googlePlaceId: place.id, ...(typeof place.rating === "number" ? { rating: place.rating } : {}) },
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
