import { readWebsite, updateWebsite } from "@/modules/website/service";
import { route } from "@/server/http/route";

export const GET = route((request) => readWebsite(request));

export const PATCH = route((request, _p, body) => updateWebsite(request, body));
