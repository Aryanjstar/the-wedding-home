import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createHousehold, listHouseholds } from "@/modules/home/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await listHouseholds(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    return json(await createHousehold(request, await readJson(request)), 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
