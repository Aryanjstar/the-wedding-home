import { deleteVendor, updateVendor } from "@/modules/vendors/service";
import { route } from "@/server/http/route";

export const PATCH = route<{ id: string }>((request, { id }, body) => updateVendor(request, id, body));

export const DELETE = route<{ id: string }>((request, { id }) => deleteVendor(request, id));
