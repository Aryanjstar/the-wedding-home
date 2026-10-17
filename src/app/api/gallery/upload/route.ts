import { runGalleryUpload } from "@/modules/gallery/direct";
import { requireMember } from "@/modules/access";
import { assertSameOrigin, json, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";
import type { HandleUploadBody } from "@vercel/blob/client";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const body = await request.json() as HandleUploadBody;
    if (body.type === "blob.generate-client-token") assertSameOrigin(request);
    const result = await runGalleryUpload(request, body, async () => {
      const { user, membership } = await requireMember(request);
      return {
        weddingId: String(membership.weddingId),
        uploadedBy: { type: "organiser" as const, userId: user._id },
      };
    });
    return json(result, 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
