import { leaveWedding } from "@/modules/home/service";
import { route } from "@/server/http/route";

export const POST = route((request) => leaveWedding(request));
