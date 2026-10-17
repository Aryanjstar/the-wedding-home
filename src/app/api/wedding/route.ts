import { createWedding, readWedding, updateWedding } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const GET = route((request) => readWedding(request));

export const POST = route(async (request, _p, body) => (await createWedding(request, body)).me, { status: 201 });

export const PATCH = route((request, _p, body) => updateWedding(request, body));
