import { registerUploadedBlob } from "@/modules/gallery/direct";
import { requireMember } from "@/modules/access";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { user, membership } = await requireMember(request);
    return json(await registerUploadedBlob(membership.weddingId, await readJson(request), { type: "organiser", userId: user._id }), 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
