import { checkPreviewRsvp } from "@/modules/guests/service";
import { route } from "@/server/http/route";

export const PUT = route((request, _p, body) => checkPreviewRsvp(request, body));
