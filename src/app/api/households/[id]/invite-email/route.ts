import { sendHouseholdEmail } from "@/modules/guests/service";
import { route } from "@/server/http/route";

export const POST = route<{ id: string }>((request, { id }) => sendHouseholdEmail(request, id));
