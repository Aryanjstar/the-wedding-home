import { deleteExpense, updateExpense } from "@/modules/expenses/service";
import { route } from "@/server/http/route";

export const PATCH = route<{ id: string }>((request, { id }, body) => updateExpense(request, id, body));

export const DELETE = route<{ id: string }>((request, { id }) => deleteExpense(request, id));
