import { reminderQueue } from "@/modules/reminders/service";
import { query, route } from "@/server/http/route";

export const GET = route((request) => reminderQueue(request, query(request).get("eventId") ?? ""));
