import { sendNow } from "@/modules/reminders/service";
import { route } from "@/server/http/route";

export const POST = route((request, _p, body) => sendNow(request, body), { status: 202 });
