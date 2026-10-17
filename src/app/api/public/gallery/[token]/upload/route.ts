import type { HandleUploadBody } from "@vercel/blob/client";

import { runGalleryUpload } from "@/modules/gallery/direct";
import { connectToDatabase } from "@/server/db/connection";
import { WeddingModel } from "@/server/db/schemas";
import { assertSameOrigin, json, ServiceError, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

async function weddingFor(token: string) {
  await connectToDatabase();
  if (!token || token.length < 20) return null;
  const wedding = await WeddingModel.findOne({ "gallery.token": token });
  if (!wedding || wedding.gallery.enabled === false) return null;
  if (wedding.gallery.guestUploadEnabled === false) {
    throw new ServiceError(403, "FORBIDDEN", "UPLOADS_DISABLED", "The family has turned guest upload off.");
  }
  return wedding;
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    const { token } = await context.params;
    const body = await request.json() as HandleUploadBody;
    if (body.type === "blob.generate-client-token") assertSameOrigin(request);
    const result = await runGalleryUpload(request, body, async () => {
      const wedding = await weddingFor(token);
      if (!wedding) throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That gallery was not found.");
      return { weddingId: String(wedding._id), uploadedBy: { type: "guest" as const } };
    });
    return json(result, 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
