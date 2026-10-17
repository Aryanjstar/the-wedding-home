import "server-only";

import mongoose from "mongoose";
import { z } from "zod";

import { publicAppUrl } from "@/config/env";
import { themePackIds } from "@/data/theme-packs";
import { musicIds, resolveTheme, worldIds } from "@/data/worlds";
import { assertId, idOf, limitReached, notFound, optionalText, requireAdmin, requireMember } from "@/modules/access";
import { presentEvent } from "@/modules/events/service";
import { embedUrl } from "@/modules/website/embed";
import { connectToDatabase } from "@/server/db/connection";
import { EventModel, WeddingModel } from "@/server/db/schemas";
import type { WeddingDoc } from "@/server/db/documents";
import { ServiceError } from "@/server/http/handle";

export { embedUrl } from "@/modules/website/embed";

/** The designed sample keeps its own pages. */
export const RESERVED_SLUGS = new Set(["aanya-and-kabir", "app", "api", "admin", "new"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type WeddingRow = WeddingDoc & { _id: unknown };

export function slugSuggestion(wedding: { brideName: string; groomName: string; weddingDate: string }) {
  const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";
  const [year, month, day] = wedding.weddingDate.split("-");
  const base = `${first(wedding.brideName)}-${first(wedding.groomName)}-${day}${month}${year}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 44);
  return base.length >= 3 ? base : `wedding-${base}`.slice(0, 44);
}

async function freeSlug(base: string, weddingId: unknown) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (RESERVED_SLUGS.has(slug)) continue;
    const taken = await WeddingModel.exists({ "site.slug": slug, _id: { $ne: weddingId } });
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function presentSite(wedding: WeddingRow) {
  const site: NonNullable<WeddingDoc["site"]> = wedding.site ?? {};
  const helpline = (side: "bride" | "groom") => {
    const line = (site.helplines ?? []).find((item) => item.side === side);
    return { side, name: line?.name ?? "", phone: line?.phone ?? "" };
  };
  return {
    slug: site.slug ?? null,
    published: Boolean(site.published && site.slug),
    publishedAt: site.publishedAt ? site.publishedAt.toISOString() : null,
    url: site.slug ? `${publicAppUrl()}/w/${site.slug}` : null,
    liveUrl: site.liveUrl ?? null,
    liveEmbed: embedUrl(site.liveUrl),
    theme: { packId: site.theme?.packId ?? "classical" },
    stay: site.stay ?? null,
    helplines: [helpline("bride"), helpline("groom")],
    families: {
      bride: { heading: site.families?.bride?.heading ?? "", blurb: site.families?.bride?.blurb ?? "" },
      groom: { heading: site.families?.groom?.heading ?? "", blurb: site.families?.groom?.blurb ?? "" },
    },
    giftNote: site.giftNote ?? null,
    aashirwad: (site.aashirwad ?? []).map((entry) => ({ id: idOf(entry._id), author: entry.author, relation: entry.relation ?? null, message: entry.message })),
  };
}

export async function readWebsite(request: Request) {
  const { weddingId } = await requireAdmin(request);
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  const events = await EventModel.find({ weddingId }).sort({ startsAt: 1 });
  const packId = wedding.site?.theme?.packId ?? "classical";
  return {
    ...presentSite(wedding),
    slugSuggestion: await freeSlug(slugSuggestion(wedding), weddingId),
    events: events.map((event) => {
      const theme = resolveTheme(packId, event.kind, event.themeOverride);
      return {
        id: idOf(event._id),
        title: event.title,
        kind: event.kind,
        startsAt: event.startsAt.toISOString(),
        override: event.themeOverride ?? null,
        resolved: { world: theme.world.id, music: theme.music, accent: theme.accent },
      };
    }),
  };
}

const helplineSchema = z.object({ side: z.enum(["bride", "groom"]), name: z.string().trim().max(100), phone: z.string().trim().max(30) }).strict();
const familySchema = z.object({ heading: z.string().trim().max(120), blurb: z.string().trim().max(600) }).strict();

const patchSchema = z.object({
  theme: z.object({ packId: z.enum(themePackIds) }).strict().optional(),
  liveUrl: optionalText(300),
  stay: optionalText(1500),
  helplines: z.array(helplineSchema).max(2).optional(),
  families: z.object({ bride: familySchema, groom: familySchema }).strict().optional(),
  giftNote: optionalText(300),
}).strict();

export async function updateWebsite(request: Request, body: unknown) {
  const { weddingId } = await requireAdmin(request);
  const input = patchSchema.parse(body);
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  if (input.theme) set["site.theme.packId"] = input.theme.packId;
  if (input.liveUrl !== undefined) {
    if (input.liveUrl) {
      if (!embedUrl(input.liveUrl)) throw new ServiceError(400, "VALIDATION_ERROR", "LIVE_URL_UNSUPPORTED", "Paste a YouTube or Vimeo link that starts with https.", { path: "liveUrl" });
      set["site.liveUrl"] = input.liveUrl;
    } else unset["site.liveUrl"] = "";
  }
  for (const field of ["stay", "giftNote"] as const) {
    if (input[field] === undefined) continue;
    if (input[field]) set[`site.${field}`] = input[field];
    else unset[`site.${field}`] = "";
  }
  if (input.helplines) {
    const lines = input.helplines.filter((line) => line.name || line.phone);
    for (const line of lines) {
      if (!line.name || !line.phone) throw new ServiceError(400, "VALIDATION_ERROR", "HELPLINE_INCOMPLETE", "Each helpline needs a name and a phone number.", { path: "helplines" });
    }
    set["site.helplines"] = lines;
  }
  if (input.families) set["site.families"] = input.families;
  await WeddingModel.updateOne({ _id: weddingId }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  return readWebsite(request);
}

const slugSchema = z.object({ slug: z.string().trim().toLowerCase().min(3).max(48) }).strict();

export async function setSlug(request: Request, body: unknown) {
  const { weddingId } = await requireAdmin(request);
  const { slug } = slugSchema.parse(body);
  if (!SLUG.test(slug)) throw new ServiceError(400, "VALIDATION_ERROR", "BAD_SLUG", "Use lowercase letters, numbers, and single hyphens.", { path: "slug" });
  if (RESERVED_SLUGS.has(slug)) throw new ServiceError(409, "CONFLICT", "SLUG_TAKEN", "That address is reserved. Choose another.", { path: "slug" });
  const taken = await WeddingModel.exists({ "site.slug": slug, _id: { $ne: weddingId } });
  if (taken) throw new ServiceError(409, "CONFLICT", "SLUG_TAKEN", "Another wedding already uses that address.", { path: "slug" });
  await WeddingModel.updateOne({ _id: weddingId }, { $set: { "site.slug": slug } });
  return { slug, url: `${publicAppUrl()}/w/${slug}` };
}

export async function publish(request: Request) {
  const { weddingId } = await requireAdmin(request);
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  let slug = wedding.site?.slug;
  if (!slug) {
    slug = await freeSlug(slugSuggestion(wedding), weddingId);
    await WeddingModel.updateOne({ _id: weddingId }, { $set: { "site.slug": slug } });
  }
  const events = await EventModel.countDocuments({ weddingId });
  if (events === 0) throw new ServiceError(409, "CONFLICT", "PUBLISH_REQUIREMENTS", "Add at least one function before publishing.");
  const publishedAt = wedding.site?.publishedAt ?? new Date();
  await WeddingModel.updateOne({ _id: weddingId }, { $set: { "site.published": true, "site.publishedAt": publishedAt } });
  return { published: true, publishedAt: publishedAt.toISOString(), url: `${publicAppUrl()}/w/${slug}`, slug };
}

export async function unpublish(request: Request) {
  const { weddingId } = await requireAdmin(request);
  await WeddingModel.updateOne({ _id: weddingId }, { $set: { "site.published": false } });
  return { published: false };
}

const overrideSchema = z.object({
  world: z.enum(worldIds).nullable().optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #8e1f2c.").nullable().optional(),
  music: z.enum(musicIds).nullable().optional(),
}).strict();

export async function setEventTheme(request: Request, eventId: string, body: unknown) {
  const { weddingId } = await requireAdmin(request);
  assertId(eventId, "function");
  const input = overrideSchema.parse(body);
  const override = { world: input.world ?? undefined, accent: input.accent ?? undefined, music: input.music ?? undefined };
  const empty = !override.world && !override.accent && !override.music;
  const updated = await EventModel.updateOne(
    { _id: eventId, weddingId },
    empty ? { $unset: { themeOverride: "" } } : { $set: { themeOverride: override } },
  );
  if (updated.matchedCount === 0) notFound("function");
  return readWebsite(request);
}

const aashirwadSchema = z.object({
  author: z.string().trim().min(1).max(100),
  relation: optionalText(100),
  message: z.string().trim().min(1).max(400),
}).strict();

export async function addAashirwad(request: Request, body: unknown) {
  const { weddingId } = await requireAdmin(request);
  const input = aashirwadSchema.parse(body);
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  if ((wedding.site?.aashirwad?.length ?? 0) >= 40) limitReached("The aashirwad wall holds 40 blessings.");
  await WeddingModel.updateOne(
    { _id: weddingId },
    { $push: { "site.aashirwad": { _id: new mongoose.Types.ObjectId(), author: input.author, ...(input.relation ? { relation: input.relation } : {}), message: input.message, createdAt: new Date() } } },
  );
  return readWebsite(request);
}

export async function removeAashirwad(request: Request, entryId: string) {
  const { weddingId } = await requireAdmin(request);
  assertId(entryId, "blessing");
  await WeddingModel.updateOne({ _id: weddingId }, { $pull: { "site.aashirwad": { _id: new mongoose.Types.ObjectId(entryId) } } });
  return readWebsite(request);
}

/* ---------- The public site ---------- */

export type PublicSite = Awaited<ReturnType<typeof siteFor>>;

async function siteFor(wedding: WeddingRow) {
  const events = await EventModel.find({ weddingId: wedding._id }).sort({ startsAt: 1 });
  const packId = wedding.site?.theme?.packId ?? "classical";
  const site = presentSite(wedding);
  return {
    slug: site.slug,
    published: site.published,
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    story: wedding.story ?? null,
    city: wedding.city,
    weddingDate: wedding.weddingDate,
    packId,
    liveEmbed: site.liveEmbed,
    stay: site.stay,
    helplines: site.helplines.filter((line) => line.name && line.phone),
    families: site.families,
    giftNote: site.giftNote,
    aashirwad: site.aashirwad,
    events: events.map((event) => ({ ...presentEvent(event), theme: resolveTheme(packId, event.kind, event.themeOverride) })),
  };
}

export async function readPublishedSite(slug: string) {
  if (!SLUG.test(slug) || RESERVED_SLUGS.has(slug)) return null;
  await connectToDatabase();
  const wedding = await WeddingModel.findOne({ "site.slug": slug, "site.published": true });
  if (!wedding) return null;
  return siteFor(wedding);
}

/** Preview for any organiser, published or not. */
export async function readPreviewSite(request: Request) {
  const { weddingId } = await requireMember(request);
  const wedding = await WeddingModel.findById(weddingId);
  if (!wedding) notFound("wedding");
  return siteFor(wedding);
}
