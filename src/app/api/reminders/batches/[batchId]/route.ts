import { batchProgress } from "@/modules/reminders/service";
import { route } from "@/server/http/route";

export const GET = route<{ batchId: string }>((request, { batchId }) => batchProgress(request, batchId));
