import { setSlug } from "@/modules/website/service";
import { route } from "@/server/http/route";

export const PUT = route((request, _p, body) => setSlug(request, body));
