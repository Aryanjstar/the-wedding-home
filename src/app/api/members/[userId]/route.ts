import { removeMember, setMemberRole } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const PATCH = route<{ userId: string }>((request, { userId }, body) => setMemberRole(request, userId, body));

export const DELETE = route<{ userId: string }>((request, { userId }) => removeMember(request, userId));
