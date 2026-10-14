import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, empty, json, readJson, toProblem } from "@/server/http/handle";
import { removeMember, setMemberRole } from "@/modules/home/service";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { userId } = await context.params;
    return json(await setMemberRole(request, userId, await readJson(request)), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { userId } = await context.params;
    await removeMember(request, userId);
    return empty(204, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
