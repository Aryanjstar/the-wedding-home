import { createTask, listTasks } from "@/modules/tasks/service";
import { route } from "@/server/http/route";

export const GET = route((request) => listTasks(request));

export const POST = route((request, _p, body) => createTask(request, body), { status: 201 });
