import { revokeMemberInvitation } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const DELETE = route<{ id: string }>((request, { id }) => revokeMemberInvitation(request, id));
