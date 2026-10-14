import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createWedding, readWedding, updateWedding } from "@/modules/home/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await readWedding(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const result = await createWedding(request, await readJson(request));
    return json(result.me, 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    return json(await updateWedding(request, await readJson(request)), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
