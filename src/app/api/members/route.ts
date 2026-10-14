import { createRequestId } from "@/server/http/request-id";
import { json, toProblem } from "@/server/http/handle";
import { listMembers } from "@/modules/home/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await listMembers(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
