import { createEvent, listEvents } from "@/modules/events/service";
import { route } from "@/server/http/route";

export const GET = route((request) => listEvents(request));

export const POST = route((request, _p, body) => createEvent(request, body), { status: 201 });
