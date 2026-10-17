import "server-only";

import { z } from "zod";

import { publicAppUrl } from "@/config/env";
import { themePack, themePackIds, type ThemePackId } from "@/data/theme-packs";
import { connectToDatabase } from "@/server/db/connection";
import { EventModel, WeddingModel } from "@/server/db/schemas";
import { ServiceError } from "@/server/http/handle";

const RESERVED_SLUGS = new Set(["aanya-and-kabir"]);

const siteSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48),
  published: z.boolean(),
  packId: z.enum(themePackIds),
  liveUrl: z.string().trim().max(300).optional(),
}).strict();

function idOf(value: unknown) {
  return String(value);
}

export function embedUrl(liveUrl: string | null | undefined): string | null {
  if (!liveUrl) return null;
  let url: URL;
  try {
    url = new URL(liveUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

export async function publishSite(request: Request, body: unknown) {
  const { requireAdmin } = await import("@/modules/home/service");
  const { membership } = await requireAdmin(request);
  const input = siteSchema.parse(body);
  if (RESERVED_SLUGS.has(input.slug)) {
    throw new ServiceError(409, "CONFLICT", "SLUG_RESERVED", "That address is the designed sample. Choose another.");
  }
  const live = input.liveUrl ? embedUrl(input.liveUrl) : null;
  if (input.liveUrl && !live) {
    throw new ServiceError(400, "VALIDATION_ERROR", "LIVE_URL", "Paste a YouTube or Vimeo link.");
  }
  await connectToDatabase();
  const taken = await WeddingModel.findOne({ "site.slug": input.slug, _id: { $ne: membership.weddingId } });
  if (taken) throw new ServiceError(409, "CONFLICT", "SLUG_TAKEN", "Another wedding already uses that address.");
  const current = await WeddingModel.findById(membership.weddingId);
  if (!current) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That wedding was not found.");
  await WeddingModel.updateOne(
    { _id: membership.weddingId },
    {
      $set: {
        "site.slug": input.slug,
        "site.published": input.published,
        "site.theme.packId": input.packId,
        ...(input.published && !current.site?.publishedAt ? { "site.publishedAt": new Date() } : {}),
        ...(input.liveUrl ? { "site.liveUrl": input.liveUrl } : {}),
      },
      ...(input.liveUrl ? {} : { $unset: { "site.liveUrl": "" } }),
    },
  );
  return {
    slug: input.slug,
    published: input.published,
    packId: input.packId satisfies ThemePackId,
    url: `${publicAppUrl()}/w/${input.slug}`,
  };
}

export async function readPublishedSite(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || RESERVED_SLUGS.has(slug)) return null;
  await connectToDatabase();
  const wedding = await WeddingModel.findOne({ "site.slug": slug, "site.published": true });
  if (!wedding) return null;
  const events = await EventModel.find({ weddingId: wedding._id }).sort({ startsAt: 1 });
  const pack = themePack(wedding.site?.theme?.packId);
  return {
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    story: wedding.story ?? null,
    city: wedding.city,
    weddingDate: wedding.weddingDate,
    pack,
    liveEmbed: embedUrl(wedding.site?.liveUrl),
    events: events.map((event) => ({
      id: idOf(event._id),
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      venue: [event.venue?.name, event.venue?.city].filter(Boolean).join(", "),
      mapsUrl: event.venue?.name || event.venue?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue?.name, event.venue?.address, event.venue?.city].filter(Boolean).join(", "))}`
        : null,
    })),
  };
}
