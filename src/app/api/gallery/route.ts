import { z } from "zod";

import { setGuestUpload, uploadOrganiserPhoto } from "@/modules/gallery/service";
import { listPhotos } from "@/modules/home/service";
import { assertSameOrigin, json, readJson, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return json(await listPhotos(request), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    return json(await uploadOrganiserPhoto(request), 201, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}

const settingsSchema = z.object({ guestUploadEnabled: z.boolean() }).strict();

export async function PATCH(request: Request) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const input = settingsSchema.parse(await readJson(request));
    return json(await setGuestUpload(request, input.guestUploadEnabled), 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
