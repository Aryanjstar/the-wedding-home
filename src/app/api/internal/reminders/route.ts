import { timingSafeEqual } from "node:crypto";

import { runReminders } from "@/modules/reminders/service";
import { json, ServiceError, toProblem } from "@/server/http/handle";
import { createRequestId } from "@/server/http/request-id";

export const maxDuration = 60;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return secret.length >= 32 && expected.length === given.length && timingSafeEqual(expected, given);
}

/** Vercel Cron calls this once a day with the cron secret. Planning and sending are both idempotent. */
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    if (!authorised(request)) throw new ServiceError(401, "UNAUTHENTICATED", "BAD_CRON_SECRET", "Not allowed.");
    const result = await runReminders();
    console.log(JSON.stringify({ operation: "reminders", ...result }));
    return json(result, 200, requestId);
  } catch (error) {
    return toProblem(error, requestId);
  }
}
