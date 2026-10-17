import { savePublicRsvp } from "@/modules/guests/service";
import { route } from "@/server/http/route";

export const PUT = route<{ token: string }>((_request, { token }, body) => savePublicRsvp(token, body));
