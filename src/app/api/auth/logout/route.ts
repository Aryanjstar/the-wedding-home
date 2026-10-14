import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, empty, toProblem, withSessionCookie } from "@/server/http/handle";
import { logOut } from "@/modules/home/service";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    await logOut(request);
    return withSessionCookie(empty(204, requestId), null);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
