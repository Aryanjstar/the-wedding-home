import { unpublish } from "@/modules/website/service";
import { route } from "@/server/http/route";

export const POST = route((request) => unpublish(request));
