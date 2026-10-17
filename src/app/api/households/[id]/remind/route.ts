import { remindHousehold } from "@/modules/reminders/service";
import { route } from "@/server/http/route";

export const POST = route<{ id: string }>((request, { id }, body) => remindHousehold(request, id, body));
