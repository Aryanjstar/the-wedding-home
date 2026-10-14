import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, empty, toProblem } from "@/server/http/handle";
import { deleteEvent } from "@/modules/home/service";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    await deleteEvent(request, id);
    return empty(204, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
