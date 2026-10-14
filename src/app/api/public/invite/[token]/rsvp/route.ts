import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, empty, readJson, toProblem } from "@/server/http/handle";
import { savePublicRsvp } from "@/modules/home/service";

export async function PUT(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { token } = await context.params;
    await savePublicRsvp(token, await readJson(request));
    return empty(204, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
