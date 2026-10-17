import { searchVendors } from "@/modules/vendors/service";
import { query, route } from "@/server/http/route";

export const GET = route((request) => searchVendors(request, query(request)));
