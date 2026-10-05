import { createRequestId } from "@/server/http/request-id";

export function GET() {
  const requestId = createRequestId();

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    },
  );
}
