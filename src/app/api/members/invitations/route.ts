import { inviteMember } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const POST = route((request, _p, body) => inviteMember(request, body), { status: 201 });
