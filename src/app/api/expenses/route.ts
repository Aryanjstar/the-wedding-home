import { createExpense, listExpenses } from "@/modules/expenses/service";
import { route } from "@/server/http/route";

export const GET = route((request) => listExpenses(request));

export const POST = route((request, _p, body) => createExpense(request, body), { status: 201 });
