import { createHousehold, listHouseholds } from "@/modules/guests/service";
import { route } from "@/server/http/route";

export const GET = route((request) => listHouseholds(request));

export const POST = route((request, _p, body) => createHousehold(request, body), { status: 201 });
