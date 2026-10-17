import { readPublicPhoto } from "@/modules/gallery/service";
import { toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function GET(request: Request, context: { params: Promise<{ token: string; id: string }> }) {
  const requestId = createRequestId();
  try {
    const { token, id } = await context.params;
    const file = await readPublicPhoto(token, id);
    if ("redirect" in file) {
      return Response.redirect(new URL(file.redirect, request.url), 302);
    }
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return toProblem(error, requestId);
  }
}
