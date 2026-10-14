import { createRequestId } from "@/server/http/request-id";
import { json, toProblem } from "@/server/http/handle";
import { readMemberInvite } from "@/modules/home/service";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    const { token } = await context.params;
    return json(await readMemberInvite(token), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
