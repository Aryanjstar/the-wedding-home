import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { forgotPassword } from "@/modules/home/service";

const MESSAGE = "If that address has an account, we have sent a reset link.";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    await forgotPassword(request, await readJson(request));
    return json({ message: MESSAGE }, 202, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
