import { readPublicInvite } from "@/modules/guests/service";
import { json, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    const { token } = await context.params;
    const invite = await readPublicInvite(token);
    if (!invite) return json({ found: false, detail: "This invitation link is not valid. Ask the family for your link again." }, 404, requestId);
    return json(invite, 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
