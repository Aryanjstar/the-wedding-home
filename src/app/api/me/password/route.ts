import { changePassword } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const POST = route((request, _p, body) => changePassword(request, body));
