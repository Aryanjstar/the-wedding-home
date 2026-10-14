import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, empty, readJson, toProblem } from "@/server/http/handle";
import { resetPassword } from "@/modules/home/service";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    await resetPassword(request, await readJson(request));
    return empty(204, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
