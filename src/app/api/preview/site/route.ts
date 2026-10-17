import { readPreviewSite } from "@/modules/website/service";
import { route } from "@/server/http/route";

export const GET = route((request) => readPreviewSite(request));
