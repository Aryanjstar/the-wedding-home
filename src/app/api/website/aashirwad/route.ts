import { addAashirwad } from "@/modules/website/service";
import { route } from "@/server/http/route";

export const POST = route((request, _p, body) => addAashirwad(request, body), { status: 201 });
