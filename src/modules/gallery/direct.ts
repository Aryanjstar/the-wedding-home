import "server-only";

import mongoose from "mongoose";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";

import { blobStoreEnabled, recordBlob } from "@/modules/gallery/service";
import { WeddingModel } from "@/server/db/schemas";
import { ServiceError } from "@/server/http/handle";

const IMAGES = ["image/jpeg", "image/png", "image/webp"];
const VIDEOS = ["video/mp4", "video/quicktime"];

const registerSchema = z.object({
  url: z.string().url().max(500),
  pathname: z.string().trim().min(3).max(500),
  eventId: z.string().regex(/^[a-f0-9]{24}$/i).nullable().optional(),
}).strict();

type Actor = { type: "organiser" | "guest"; userId?: mongoose.Types.ObjectId };

export async function runGalleryUpload(request: Request, body: HandleUploadBody, authorize: () => Promise<{ weddingId: string; uploadedBy: Actor }>) {
  if (!blobStoreEnabled()) {
    throw new ServiceError(503, "INTERNAL_ERROR", "DEPENDENCY_UNAVAILABLE", "The file store is not connected yet.");
  }
  let scope: { weddingId: string; uploadedBy: Actor } | null = null;
  if (body.type === "blob.generate-client-token") scope = await authorize();
  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      if (!scope || !pathname.startsWith(`weddings/${scope.weddingId}/`)) {
        throw new ServiceError(403, "FORBIDDEN", "FORBIDDEN", "That upload is for another wedding.");
      }
      let video = false;
      let eventId: string | null = null;
      try {
        const payload = JSON.parse(clientPayload ?? "{}") as { contentType?: string; eventId?: unknown };
        video = payload.contentType?.startsWith("video/") === true;
        eventId = typeof payload.eventId === "string" && /^[a-f0-9]{24}$/i.test(payload.eventId) ? payload.eventId : null;
      } catch {
        video = false;
      }
      return {
        allowedContentTypes: video ? VIDEOS : IMAGES,
        maximumSizeInBytes: video ? 100_000_000 : 15_000_000,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({
          weddingId: scope.weddingId,
          actor: scope.uploadedBy.type,
          userId: scope.uploadedBy.userId ? String(scope.uploadedBy.userId) : null,
          eventId,
        }),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      const payload = JSON.parse(tokenPayload ?? "{}") as { weddingId?: string; actor?: "organiser" | "guest"; userId?: string | null; eventId?: string | null };
      if (!payload.weddingId) return;
      const wedding = await WeddingModel.findById(payload.weddingId);
      if (!wedding) return;
      const userId = payload.userId && mongoose.Types.ObjectId.isValid(payload.userId)
        ? new mongoose.Types.ObjectId(payload.userId)
        : undefined;
      await recordBlob({
        weddingId: wedding._id,
        url: blob.url,
        pathname: blob.pathname,
        eventId: payload.eventId,
        uploadedBy: { type: payload.actor === "guest" ? "guest" : "organiser", userId },
      });
    },
  });
}

export async function registerUploadedBlob(weddingId: mongoose.Types.ObjectId, body: unknown, uploadedBy: Actor) {
  const input = registerSchema.parse(body);
  if (!input.pathname.startsWith(`weddings/${String(weddingId)}/`)) {
    throw new ServiceError(403, "FORBIDDEN", "FORBIDDEN", "That upload is for another wedding.");
  }
  return recordBlob({ weddingId, url: input.url, pathname: input.pathname, eventId: input.eventId, uploadedBy });
}
