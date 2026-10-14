import { createRequestId } from "@/server/http/request-id";
import { json, toProblem } from "@/server/http/handle";
import { readMe } from "@/modules/home/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await readMe(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
