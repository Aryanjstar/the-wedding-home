import { registerUploadedBlob } from "@/modules/gallery/direct";
import { connectToDatabase } from "@/server/db/connection";
import { WeddingModel } from "@/server/db/schemas";
import { assertSameOrigin, json, readJson, toProblem, ServiceError } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { token } = await context.params;
    await connectToDatabase();
    const wedding = await WeddingModel.findOne({ "gallery.token": token });
    if (!wedding || wedding.gallery.enabled === false) {
      throw new ServiceError(404, "NOT_FOUND", "NOT_FOUND", "That gallery was not found.");
    }
    if (wedding.gallery.guestUploadEnabled === false) {
      throw new ServiceError(403, "FORBIDDEN", "UPLOADS_DISABLED", "The family has turned guest upload off.");
    }
    return json(await registerUploadedBlob(wedding._id, await readJson(request), { type: "guest" }), 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
