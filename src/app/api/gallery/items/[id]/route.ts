import { deleteOrganiserPhoto, updateOrganiserPhoto } from "@/modules/gallery/service";
import { route } from "@/server/http/route";

export const PATCH = route<{ id: string }>((request, { id }, body) => updateOrganiserPhoto(request, id, body));

export const DELETE = route<{ id: string }>((request, { id }) => deleteOrganiserPhoto(request, id));
