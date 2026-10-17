import { resendMemberInvitation } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const POST = route<{ id: string }>((request, { id }) => resendMemberInvitation(request, id));
