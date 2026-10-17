import { readOrganiserPhoto } from "@/modules/gallery/service";
import { toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  try {
    const { id } = await context.params;
    const download = new URL(request.url).searchParams.get("download") === "1";
    const file = await readOrganiserPhoto(request, id);
    if (file.kind === "redirect") return Response.redirect(new URL(file.url, request.url), 302);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
        ...(download ? { "Content-Disposition": `attachment; filename="${file.filename}"` } : {}),
      },
    });
  } catch (error) {
    return toProblem(error, requestId);
  }
}
