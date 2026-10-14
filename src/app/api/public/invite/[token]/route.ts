import { createRequestId } from "@/server/http/request-id";
import { json, toProblem } from "@/server/http/handle";
import { readPublicInvite } from "@/modules/home/service";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    const { token } = await context.params;
    const invite = await readPublicInvite(token);
    if (!invite) {
      return json({ found: false }, 404, requestId);
    }
    return json(invite, 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
