import { createRequestId } from "@/server/http/request-id";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createExpense, listExpenses } from "@/modules/home/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await listExpenses(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    return json(await createExpense(request, await readJson(request)), 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
