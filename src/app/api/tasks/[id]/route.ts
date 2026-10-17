import { deleteTask, updateTask } from "@/modules/tasks/service";
import { route } from "@/server/http/route";

export const PATCH = route<{ id: string }>((request, { id }, body) => updateTask(request, id, body));

export const DELETE = route<{ id: string }>((request, { id }) => deleteTask(request, id));
