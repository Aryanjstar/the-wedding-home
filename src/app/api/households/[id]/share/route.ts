import { shareHousehold } from "@/modules/guests/service";
import { query, route } from "@/server/http/route";

export const GET = route<{ id: string }>((request, { id }) => {
  const params = query(request);
  const kind = params.get("kind");
  return shareHousehold(request, id, kind === "please_rsvp" || kind === "see_you_soon" ? kind : "invite", params.get("eventId"));
});
