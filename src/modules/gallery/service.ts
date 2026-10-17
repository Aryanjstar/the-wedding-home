import "server-only";

import mongoose from "mongoose";

import { sha256Hex } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/connection";
import { GalleryModel, MediaModel, WeddingModel } from "@/server/db/schemas";
import { ServiceError } from "@/server/http/handle";
import { clientIp, consumeRateLimit } from "@/server/http/rate-limit";

const SERVER_CAP = 4_000_000;
const IMAGE_CAP = 15_000_000;
const VIDEO_CAP = 100_000_000;
const STORED_CAP = 200;
const ITEM_CAP = 10_000;

export function blobStoreEnabled() {
  return (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim().length > 10;
}

function idOf(value: unknown) {
  return String(value);
}

async function memberContext(request: Request) {
  const { requireMember } = await import("@/modules/access");
  return requireMember(request);
}

async function eventOnWedding(weddingId: mongoose.Types.ObjectId, eventId: unknown) {
  if (typeof eventId !== "string" || !/^[a-f0-9]{24}$/i.test(eventId)) return null;
  const { EventModel } = await import("@/server/db/schemas");
  const event = await EventModel.findOne({ _id: eventId, weddingId }, { _id: 1 });
  return event ? event._id : null;
}

function mediaType(bytes: Buffer): { kind: "photo" | "video"; contentType: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { kind: "photo", contentType: "image/jpeg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return { kind: "photo", contentType: "image/png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { kind: "photo", contentType: "image/webp" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") {
    const brand = bytes.toString("ascii", 8, 12);
    return { kind: "video", contentType: brand.startsWith("qt") ? "video/quicktime" : "video/mp4" };
  }
  return null;
}

function capFor(kind: "photo" | "video", direct: boolean) {
  if (!direct) return SERVER_CAP;
  return kind === "video" ? VIDEO_CAP : IMAGE_CAP;
}

function mediaUrl(publicPath: string | null | undefined, fallback: string) {
  if (publicPath?.startsWith("/photos/") || publicPath?.startsWith("https://")) return publicPath;
  return fallback;
}

function titleFrom(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "";
  const clean = base.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  return (clean || "Photograph").slice(0, 80);
}

function bytesOf(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
}

async function savePhoto(input: {
  weddingId: mongoose.Types.ObjectId;
  bytes: Buffer;
  title: string;
  eventId?: mongoose.Types.ObjectId | null;
  uploadedBy: { type: "organiser" | "guest"; userId?: mongoose.Types.ObjectId };
}) {
  const media = mediaType(input.bytes);
  if (!media) {
    throw new ServiceError(400, "VALIDATION_ERROR", "UNSUPPORTED_FILE", "Use a JPEG, PNG, WebP, MP4, or QuickTime file.");
  }
  if (input.bytes.length > capFor(media.kind, false)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "FILE_TOO_LARGE", "Files sent through the app stay under 4 MB. Larger photographs and videos upload directly when the file store is connected.");
  }
  const contentType = media.contentType;
  const stored = await GalleryModel.countDocuments({ weddingId: input.weddingId, publicPath: { $exists: false } });
  if (stored >= STORED_CAP) {
    throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This gallery holds 200 files sent through the app. Connect the file store for more.");
  }
  const itemId = new mongoose.Types.ObjectId();
  const storageKey = `weddings/${idOf(input.weddingId)}/gallery/${idOf(itemId)}`;
  await MediaModel.create({
    storageKey,
    contentType,
    bytes: input.bytes.length,
    data: input.bytes,
    schemaVersion: 1,
  });
  try {
    await GalleryModel.create({
      _id: itemId,
      weddingId: input.weddingId,
      kind: media.kind,
      contentType,
      bytes: input.bytes.length,
      storageKey,
      title: input.title,
      ...(input.eventId ? { eventId: input.eventId } : {}),
      uploadedBy: input.uploadedBy,
      hidden: false,
      schemaVersion: 1,
    });
  } catch (error) {
    await MediaModel.deleteOne({ storageKey });
    throw error;
  }
  return { id: idOf(itemId), title: input.title, url: `/api/gallery/items/${idOf(itemId)}/file` };
}

export async function readUpload(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "FILE_REQUIRED", "Choose a photograph or a video.");
  }
  if (file.size > SERVER_CAP) {
    throw new ServiceError(400, "VALIDATION_ERROR", "FILE_TOO_LARGE", "Files sent through the app stay under 4 MB. Larger photographs and videos upload directly when the file store is connected.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const eventId = form.get("eventId");
  return { bytes, title: titleFrom(file.name), eventId: typeof eventId === "string" ? eventId : null };
}

export async function uploadOrganiserPhoto(request: Request) {
  const { user, membership } = await memberContext(request);
  await connectToDatabase();
  await consumeRateLimit("gallery-upload", idOf(user._id), 30, 15 * 60 * 1000);
  const file = await readUpload(request);
  return savePhoto({
    weddingId: membership.weddingId,
    bytes: file.bytes,
    title: file.title,
    eventId: await eventOnWedding(membership.weddingId, file.eventId),
    uploadedBy: { type: "organiser", userId: user._id },
  });
}

export async function readOrganiserPhoto(request: Request, itemId: string) {
  const { membership } = await memberContext(request);
  await connectToDatabase();
  if (!/^[a-f0-9]{24}$/i.test(itemId)) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  const row = await GalleryModel.findOne({ _id: itemId, weddingId: membership.weddingId });
  if (!row) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  const filename = `${(row.title ?? "photograph").replace(/[^\w. -]/g, "_")}.${row.contentType.split("/")[1]?.replace("quicktime", "mov") ?? "bin"}`;
  const stored = row.publicPath ?? "";
  if (stored.startsWith("https://") || stored.startsWith("/photos/")) return { kind: "redirect" as const, url: stored, filename };
  const media = await MediaModel.findOne({ storageKey: row.storageKey });
  if (!media) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  return { kind: "bytes" as const, contentType: String(row.contentType), bytes: bytesOf(media.data), filename };
}

export async function updateOrganiserPhoto(request: Request, itemId: string, body: unknown) {
  const { membership } = await memberContext(request);
  await connectToDatabase();
  if (!/^[a-f0-9]{24}$/i.test(itemId)) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  const input = (body ?? {}) as { hidden?: unknown; eventId?: unknown };
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  if (typeof input.hidden === "boolean") set.hidden = input.hidden;
  if (input.eventId === null) unset.eventId = "";
  else if (input.eventId !== undefined) {
    const eventId = await eventOnWedding(membership.weddingId, input.eventId);
    if (!eventId) throw new ServiceError(400, "VALIDATION_ERROR", "UNKNOWN_EVENT", "Choose a function on this wedding.");
    set.eventId = eventId;
  }
  const updated = await GalleryModel.updateOne(
    { _id: itemId, weddingId: membership.weddingId },
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
  );
  if (updated.matchedCount === 0) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  return { id: itemId, ...set };
}

export async function listOrganiserGallery(request: Request) {
  const { membership } = await memberContext(request);
  await connectToDatabase();
  const { EventModel } = await import("@/server/db/schemas");
  const { publicAppUrl } = await import("@/config/env");
  const wedding = await WeddingModel.findById(membership.weddingId);
  if (!wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That wedding was not found.");
  const [rows, events] = await Promise.all([
    GalleryModel.find({ weddingId: membership.weddingId }).sort({ createdAt: -1 }).limit(2000),
    EventModel.find({ weddingId: membership.weddingId }, { title: 1 }).sort({ startsAt: 1 }),
  ]);
  return {
    enabled: wedding.gallery.enabled !== false,
    guestUploadEnabled: wedding.gallery.guestUploadEnabled !== false,
    directUpload: blobStoreEnabled(),
    uploadPrefix: `weddings/${idOf(wedding._id)}/gallery`,
    url: `${publicAppUrl()}/g/${wedding.gallery.token}`,
    albums: [
      ...events.map((event) => ({ eventId: idOf(event._id), title: event.title, total: rows.filter((row) => idOf(row.eventId) === idOf(event._id)).length })),
      { eventId: null, title: "Other memories", total: rows.filter((row) => !row.eventId).length },
    ],
    items: rows.map((row) => ({
      id: idOf(row._id),
      title: row.title ?? "Photograph",
      kind: row.kind,
      url: mediaUrl(row.publicPath, `/api/gallery/items/${idOf(row._id)}/file`),
      eventId: row.eventId ? idOf(row.eventId) : null,
      hidden: row.hidden,
      uploadedBy: row.uploadedBy?.type ?? "organiser",
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function setGallery(request: Request, body: unknown) {
  const { membership } = await memberContext(request);
  await connectToDatabase();
  const input = (body ?? {}) as { enabled?: unknown; guestUploadEnabled?: unknown };
  const set: Record<string, boolean> = {};
  if (typeof input.enabled === "boolean") set["gallery.enabled"] = input.enabled;
  if (typeof input.guestUploadEnabled === "boolean") set["gallery.guestUploadEnabled"] = input.guestUploadEnabled;
  if (Object.keys(set).length === 0) throw new ServiceError(400, "VALIDATION_ERROR", "NOTHING_TO_CHANGE", "Choose a setting.");
  await WeddingModel.updateOne({ _id: membership.weddingId }, { $set: set });
  return { ok: true };
}

export async function deleteOrganiserPhoto(request: Request, itemId: string) {
  const { membership } = await memberContext(request);
  await connectToDatabase();
  if (!/^[a-f0-9]{24}$/i.test(itemId)) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  const row = await GalleryModel.findOne({ _id: itemId, weddingId: membership.weddingId });
  if (!row) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  if (row.publicPath?.includes(".blob.vercel-storage.com")) {
    try {
      const { del } = await import("@vercel/blob");
      await del(row.publicPath);
    } catch {
      throw new ServiceError(503, "INTERNAL_ERROR", "STORAGE_DELETE_FAILED", "The file is still stored. Try again.");
    }
  } else {
    const removed = await MediaModel.deleteOne({ storageKey: row.storageKey });
    if (removed.deletedCount !== 1 && !row.publicPath?.startsWith("/photos/")) {
      throw new ServiceError(503, "INTERNAL_ERROR", "STORAGE_DELETE_FAILED", "The file is still stored. Try again.");
    }
  }
  await GalleryModel.deleteOne({ _id: row._id });
}

export async function setGuestUpload(request: Request, enabled: boolean) {
  const { membership } = await memberContext(request);
  await connectToDatabase();
  await WeddingModel.updateOne({ _id: membership.weddingId }, { $set: { "gallery.guestUploadEnabled": enabled } });
  return { guestUploadEnabled: enabled };
}

async function weddingByGalleryToken(token: string) {
  await connectToDatabase();
  if (!token || token.length < 20) return null;
  return WeddingModel.findOne({ "gallery.token": token });
}

export async function readPublicGallery(token: string) {
  const wedding = await weddingByGalleryToken(token);
  if (!wedding || wedding.gallery.enabled === false) return null;
  const { EventModel } = await import("@/server/db/schemas");
  const [rows, events] = await Promise.all([
    GalleryModel.find({ weddingId: wedding._id, hidden: false }).sort({ createdAt: -1 }).limit(2000),
    EventModel.find({ weddingId: wedding._id }, { title: 1 }).sort({ startsAt: 1 }),
  ]);
  return {
    couple: wedding.title || `${wedding.brideName} & ${wedding.groomName}`,
    packId: wedding.site?.theme?.packId ?? "classical",
    albums: events.map((event) => ({ eventId: idOf(event._id), title: event.title })),
    directUpload: blobStoreEnabled(),
    uploadPrefix: `weddings/${idOf(wedding._id)}/gallery`,
    guestUploadEnabled: wedding.gallery.guestUploadEnabled !== false,
    items: rows.map((row) => ({
      id: idOf(row._id),
      title: row.title ?? "Photograph",
      kind: row.kind,
      eventId: row.eventId ? idOf(row.eventId) : null,
      url: mediaUrl(row.publicPath, `/api/public/gallery/${token}/items/${idOf(row._id)}`),
    })),
  };
}

export async function uploadGuestPhoto(request: Request, token: string) {
  await consumeRateLimit("gallery-guest", sha256Hex(token), 30, 15 * 60 * 1000);
  await consumeRateLimit("gallery-guest-ip", clientIp(request), 30, 15 * 60 * 1000);
  const wedding = await weddingByGalleryToken(token);
  if (!wedding || wedding.gallery.enabled === false) {
    throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That gallery was not found.");
  }
  if (wedding.gallery.guestUploadEnabled === false) {
    throw new ServiceError(403, "FORBIDDEN", "UPLOADS_DISABLED", "The family has turned guest upload off.");
  }
  const file = await readUpload(request);
  const saved = await savePhoto({
    weddingId: wedding._id,
    bytes: file.bytes,
    title: file.title,
    eventId: await eventOnWedding(wedding._id, file.eventId),
    uploadedBy: { type: "guest" },
  });
  return { id: saved.id, title: saved.title };
}

export async function readPublicPhoto(token: string, itemId: string): Promise<{ redirect: string } | { contentType: string; bytes: Buffer }> {
  const wedding = await weddingByGalleryToken(token);
  if (!wedding || wedding.gallery.enabled === false) {
    throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  }
  if (!/^[a-f0-9]{24}$/i.test(itemId)) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  const row = await GalleryModel.findOne({ _id: itemId, weddingId: wedding._id, hidden: false });
  if (!row) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  const stored = row.publicPath;
  if (stored?.startsWith("/photos/") || stored?.startsWith("https://")) return { redirect: stored };
  const media = await MediaModel.findOne({ storageKey: row.storageKey });
  if (!media) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That photograph was not found.");
  return { contentType: row.contentType, bytes: bytesOf(media.data) };
}

function blobHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export async function recordBlob(input: {
  weddingId: mongoose.Types.ObjectId;
  url: string;
  pathname: string;
  eventId?: unknown;
  uploadedBy: { type: "organiser" | "guest"; userId?: mongoose.Types.ObjectId };
}) {
  await connectToDatabase();
  const host = blobHost(input.url);
  if (!host.endsWith(".blob.vercel-storage.com") && host !== "blob.vercel-storage.com") {
    throw new ServiceError(400, "VALIDATION_ERROR", "UNSUPPORTED_FILE", "That file did not come from the gallery store.");
  }
  const existing = await GalleryModel.findOne({ storageKey: input.pathname, weddingId: input.weddingId });
  if (existing) return { id: idOf(existing._id), title: existing.title ?? "Photograph", kind: existing.kind };
  const head = await fetch(input.url, { method: "HEAD" });
  if (!head.ok) throw new ServiceError(400, "VALIDATION_ERROR", "UNSUPPORTED_FILE", "That upload did not finish.");
  const bytes = Number(head.headers.get("content-length") ?? "0");
  const sample = await fetch(input.url, { headers: { Range: "bytes=0-31" } });
  const prefix = Buffer.from(await sample.arrayBuffer());
  const detected = mediaType(prefix);
  if (!detected) throw new ServiceError(400, "VALIDATION_ERROR", "UNSUPPORTED_FILE", "Use a JPEG, PNG, WebP, MP4, or QuickTime file.");
  if (bytes <= 0 || bytes > capFor(detected.kind, true)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "FILE_TOO_LARGE", detected.kind === "video" ? "Videos stay under 100 MB." : "Photographs stay under 15 MB.");
  }
  const count = await GalleryModel.countDocuments({ weddingId: input.weddingId });
  if (count >= ITEM_CAP) throw new ServiceError(409, "CONFLICT", "LIMIT_REACHED", "This gallery is full.");
  const title = titleFrom(input.pathname);
  try {
    const row = await GalleryModel.create({
      weddingId: input.weddingId,
      kind: detected.kind,
      contentType: detected.contentType,
      bytes,
      storageKey: input.pathname,
      publicPath: input.url,
      title,
      ...((await eventOnWedding(input.weddingId, input.eventId)) ? { eventId: await eventOnWedding(input.weddingId, input.eventId) } : {}),
      uploadedBy: input.uploadedBy,
      hidden: false,
      schemaVersion: 1,
    });
    return { id: idOf(row._id), title, kind: detected.kind };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
      const won = await GalleryModel.findOne({ storageKey: input.pathname, weddingId: input.weddingId });
      if (won) return { id: idOf(won._id), title: won.title ?? title, kind: won.kind };
    }
    throw error;
  }
}

export async function galleryLink(request: Request) {
  const { membership } = await memberContext(request);
  await connectToDatabase();
  const { publicAppUrl } = await import("@/config/env");
  const wedding = await WeddingModel.findById(membership.weddingId);
  if (!wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That wedding was not found.");
  return { url: `${publicAppUrl()}/g/${wedding.gallery.token}`, couple: wedding.title || `${wedding.brideName} & ${wedding.groomName}` };
}
