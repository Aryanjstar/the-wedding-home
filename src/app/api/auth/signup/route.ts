import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem, withSessionCookie } from "@/server/http/handle";
import { signUp } from "@/modules/home/service";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const result = await signUp(request, await readJson(request));
    return withSessionCookie(json(result.me, 201, requestId), result.token);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
