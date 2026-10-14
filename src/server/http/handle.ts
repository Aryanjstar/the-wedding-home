import { ZodError } from "zod";

import { problem, type ProblemCode } from "@/server/http/problem";
import { getAppEnv } from "@/config/env";
import { sessionCookieName, sessionCookieOptions } from "@/server/auth/session";

export class ServiceError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: ProblemCode,
    readonly reason: string,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 256 * 1024) {
    throw new ServiceError(413, "VALIDATION_ERROR", "BODY_TOO_LARGE", "That request is too large.");
  }
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ServiceError(400, "VALIDATION_ERROR", "INVALID_JSON", "Send JSON.");
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(getAppEnv().NEXT_PUBLIC_APP_URL).origin;
  if (!origin || origin !== expected) {
    throw new ServiceError(403, "FORBIDDEN", "BAD_ORIGIN", "Open this from the wedding site.");
  }
}

export function json(body: unknown, status: number, requestId: string) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
    },
  });
}

export function empty(status: number, requestId: string) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
    },
  });
}

export function withSessionCookie(response: Response, token: string | null) {
  const appUrl = getAppEnv().NEXT_PUBLIC_APP_URL;
  const options = sessionCookieOptions(appUrl);
  const name = sessionCookieName(appUrl);
  const secure = options.secure ? "; Secure" : "";
  const value = token
    ? `${name}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`
    : `${name}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
  response.headers.append("Set-Cookie", value);
  return response;
}

export function sessionTokenFrom(request: Request): string | null {
  const name = sessionCookieName(getAppEnv().NEXT_PUBLIC_APP_URL);
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function toProblem(error: unknown, requestId: string): Response {
  if (error instanceof ServiceError) {
    return problem({
      code: error.code,
      status: error.httpStatus === 500 || error.httpStatus === 503 ? error.httpStatus : undefined,
      reason: error.reason,
      detail: error.message,
      requestId,
      details: error.details,
      retryAfter: error.retryAfter,
    });
  }

  if (error instanceof ZodError) {
    const paths = error.issues.flatMap((issue) => issue.path.map(String));
    const detail = paths.includes("email")
      ? "Enter a valid email address."
      : paths.includes("password")
        ? "Use 10 to 128 characters."
        : "Check the fields and try again.";
    return problem({
      code: "VALIDATION_ERROR",
      detail,
      requestId,
      errors: error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        reason: "INVALID",
        message: issue.message,
      })),
    });
  }

  console.error(error);
  return problem({
    code: "INTERNAL_ERROR",
    detail: "Something went wrong. Try again.",
    requestId,
  });
}
