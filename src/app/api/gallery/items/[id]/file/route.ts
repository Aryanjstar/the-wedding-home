import { readOrganiserPhoto } from "@/modules/gallery/service";
import { toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    const { id } = await context.params;
    const file = await readOrganiserPhoto(request, id);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    return toProblem(error, requestId);
  }
}
