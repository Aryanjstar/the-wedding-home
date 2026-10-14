import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, empty, toProblem } from "@/server/http/handle";
import { resendMemberInvitation } from "@/modules/home/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    await resendMemberInvitation(request, id);
    return empty(204, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
