import { setEventTheme } from "@/modules/website/service";
import { route } from "@/server/http/route";

export const PUT = route<{ eventId: string }>((request, { eventId }, body) => setEventTheme(request, eventId, body));

export const DELETE = route<{ eventId: string }>((request, { eventId }) => setEventTheme(request, eventId, {}));
