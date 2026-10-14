import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, toProblem } from "@/server/http/handle";
import { sendHouseholdEmail } from "@/modules/home/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    return json(await sendHouseholdEmail(request, id), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
