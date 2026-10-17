import { createVendor, listVendors } from "@/modules/vendors/service";
import { route } from "@/server/http/route";

export const GET = route((request) => listVendors(request));

export const POST = route((request, _p, body) => createVendor(request, body), { status: 201 });
