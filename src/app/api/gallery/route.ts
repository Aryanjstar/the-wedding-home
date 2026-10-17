import { listOrganiserGallery, setGallery, uploadOrganiserPhoto } from "@/modules/gallery/service";
import { route } from "@/server/http/route";

export const GET = route((request) => listOrganiserGallery(request));

export const POST = route((request) => uploadOrganiserPhoto(request), { status: 201 });

export const PATCH = route((request, _params, body) => setGallery(request, body));
