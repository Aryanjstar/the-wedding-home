import { deleteHousehold, updateHousehold } from "@/modules/guests/service";
import { query, route } from "@/server/http/route";

export const PATCH = route<{ id: string }>((request, { id }, body) => updateHousehold(request, id, body, query(request).get("confirm") === "true"));

export const DELETE = route<{ id: string }>((request, { id }) => deleteHousehold(request, id));
