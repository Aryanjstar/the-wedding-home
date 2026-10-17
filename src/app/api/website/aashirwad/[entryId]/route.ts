import { removeAashirwad } from "@/modules/website/service";
import { route } from "@/server/http/route";

export const DELETE = route<{ entryId: string }>((request, { entryId }) => removeAashirwad(request, entryId));
