import { assertSameOrigin, empty, json, readJson, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

type Handler<P> = (request: Request, params: P, body: unknown) => Promise<unknown>;

/**
 * One thin route handler: same-origin check on writes, JSON in, service call, JSON or 204 out.
 * A service that returns `undefined` answers 204.
 */
export function route<P = Record<string, never>>(handler: Handler<P>, options: { status?: number } = {}) {
  return async (request: Request, context: { params: Promise<P> }) => {
    const requestId = createRequestId();
    try {
      const write = request.method !== "GET" && request.method !== "HEAD";
      if (write) assertSameOrigin(request);
      const hasBody = write && request.method !== "DELETE" && (request.headers.get("content-type") ?? "").includes("application/json");
      const body = hasBody ? await readJson(request) : {};
      const params = (context ? await context.params : {}) as P;
      const result = await handler(request, params, body);
      if (result === undefined) return empty(204, requestId);
      return json(result, options.status ?? 200, requestId);
    } catch (error) {
      return toProblem(error, requestId);
    }
  };
}

export function query(request: Request) {
  return new URL(request.url).searchParams;
}
