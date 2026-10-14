import "server-only";

import { createHmac } from "node:crypto";

import { getRateLimitEnv } from "@/config/env";
import { RateLimitModel } from "@/server/db/schemas";
import { ServiceError } from "@/server/http/handle";

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "local";
}

export function rateLimitKey(secret: string, scope: string, subject: string, windowStart: number) {
  const digest = createHmac("sha256", secret).update(`${scope}:${subject}`).digest("hex");
  return `${digest}:${windowStart}`;
}

export async function consumeRateLimit(scope: string, subject: string, limit: number, windowMs: number) {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const id = rateLimitKey(getRateLimitEnv().RATE_LIMIT_HMAC_SECRET, scope, subject, windowStart);
  const row = await RateLimitModel.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expireAt: new Date(windowStart + windowMs + 60_000) } },
    { upsert: true, returnDocument: "after" },
  );
  if ((row?.count ?? 1) > limit) {
    const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - Date.now()) / 1000));
    throw new ServiceError(429, "RATE_LIMITED", "RATE_LIMITED", "Too many attempts. Wait a little, then try again.", undefined, retryAfter);
  }
}
