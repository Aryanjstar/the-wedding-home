import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { joinWedding } from "@/modules/home/service";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    return json(await joinWedding(request, await readJson(request)), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
