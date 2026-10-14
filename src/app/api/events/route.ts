import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createEvent, listEvents } from "@/modules/home/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await listEvents(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const event = await createEvent(request, await readJson(request));
    return json(event, 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
