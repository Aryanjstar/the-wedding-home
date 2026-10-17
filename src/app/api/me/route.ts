import { readMe, updateMe } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const GET = route((request) => readMe(request));

export const PATCH = route((request, _p, body) => updateMe(request, body));
