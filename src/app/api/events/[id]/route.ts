import { deleteEvent, readEvent, updateEvent } from "@/modules/events/service";
import { query, route } from "@/server/http/route";

export const GET = route<{ id: string }>((request, { id }) => readEvent(request, id));

export const PATCH = route<{ id: string }>((request, { id }, body) => updateEvent(request, id, body));

export const DELETE = route<{ id: string }>((request, { id }) => deleteEvent(request, id, query(request).get("confirm") === "true"));
