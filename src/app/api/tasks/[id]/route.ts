import { updateTask } from "@/modules/home/service";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    return json(await updateTask(request, id, await readJson(request)), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
