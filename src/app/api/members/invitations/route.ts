import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { inviteMember } from "@/modules/home/service";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    return json(await inviteMember(request, await readJson(request)), 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
