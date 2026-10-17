import { listAssignees } from "@/modules/tasks/service";
import { route } from "@/server/http/route";

export const GET = route((request) => listAssignees(request));
