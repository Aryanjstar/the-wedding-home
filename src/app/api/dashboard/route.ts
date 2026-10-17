import { dashboard } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const GET = route((request) => dashboard(request));
