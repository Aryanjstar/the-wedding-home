import { publishSite } from "@/modules/website/service";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function PATCH(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    return json(await publishSite(request, await readJson(request)), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
