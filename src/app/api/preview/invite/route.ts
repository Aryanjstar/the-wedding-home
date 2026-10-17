import { readPreviewInvite } from "@/modules/guests/service";
import { route } from "@/server/http/route";

export const GET = route((request) => readPreviewInvite(request));
