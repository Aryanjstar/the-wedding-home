import { createRequestId } from "@/server/http/request-id";
import { json, toProblem } from "@/server/http/handle";
import { shareHousehold } from "@/modules/home/service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    const { id } = await context.params;
    return json(await shareHousehold(request, id), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
