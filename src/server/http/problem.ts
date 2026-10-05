export const PROBLEM_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ProblemCode = (typeof PROBLEM_CODES)[number];

const STATUS: Record<ProblemCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

const TITLE: Record<ProblemCode, string> = {
  VALIDATION_ERROR: "Validation failed",
  UNAUTHENTICATED: "Unauthenticated",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Not found",
  CONFLICT: "Conflict",
  RATE_LIMITED: "Too many requests",
  INTERNAL_ERROR: "Internal error",
};

const TYPE: Record<ProblemCode, string> = {
  VALIDATION_ERROR: "/problems/validation-error",
  UNAUTHENTICATED: "/problems/unauthenticated",
  FORBIDDEN: "/problems/forbidden",
  NOT_FOUND: "/problems/not-found",
  CONFLICT: "/problems/conflict",
  RATE_LIMITED: "/problems/rate-limited",
  INTERNAL_ERROR: "/problems/internal-error",
};

export type FieldError = {
  path: string;
  reason: string;
  message: string;
};

export type ProblemInput = {
  code: ProblemCode;
  detail: string;
  requestId: string;
  reason?: string;
  errors?: FieldError[];
  details?: Record<string, unknown>;
  retryAfter?: number;
  status?: 500 | 503;
};

export function problem(input: ProblemInput): Response {
  const status = input.status ?? STATUS[input.code];
  const body: Record<string, unknown> = {
    type: TYPE[input.code],
    title: TITLE[input.code],
    status,
    code: input.code,
    detail: input.detail,
    requestId: input.requestId,
  };

  if (input.reason) body.reason = input.reason;
  if (input.errors) body.errors = input.errors;
  if (input.details) body.details = input.details;

  const headers = new Headers({
    "Content-Type": "application/problem+json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": input.requestId,
  });

  if (input.retryAfter !== undefined) {
    headers.set("Retry-After", String(input.retryAfter));
  }

  return new Response(JSON.stringify(body), { status, headers });
}
