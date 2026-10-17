import { joinWedding } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const POST = route((request, _p, body) => joinWedding(request, body));
