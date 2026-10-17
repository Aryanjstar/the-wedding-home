import { readPublicGallery, uploadGuestPhoto } from "@/modules/gallery/service";
import { json, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    const { token } = await context.params;
    const gallery = await readPublicGallery(token);
    if (!gallery) return json({ title: "Not found" }, 404, requestId);
    return json(gallery, 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  try {
    const { token } = await context.params;
    return json(await uploadGuestPhoto(request, token), 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
