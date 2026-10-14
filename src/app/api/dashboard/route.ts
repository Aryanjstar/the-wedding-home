import { createRequestId } from "@/server/http/request-id";
import { json, toProblem } from "@/server/http/handle";
import { dashboard } from "@/modules/home/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await dashboard(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
