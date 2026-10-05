import { describe, expect, it } from "vitest";

import { problem } from "@/server/http/problem";

describe("problem", () => {
  it("returns the stable error shape", async () => {
    const response = problem({
      code: "CONFLICT",
      reason: "LAST_ADMIN",
      detail: "A wedding must keep at least one Admin.",
      requestId: "req_8f3a1c00",
    });

    expect(response.status).toBe(409);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    expect(response.headers.get("X-Request-Id")).toBe("req_8f3a1c00");
    await expect(response.json()).resolves.toEqual({
      type: "/problems/conflict",
      title: "Conflict",
      status: 409,
      code: "CONFLICT",
      reason: "LAST_ADMIN",
      detail: "A wedding must keep at least one Admin.",
      requestId: "req_8f3a1c00",
    });
  });

  it("can mark a dependency failure as unavailable", () => {
    const response = problem({
      code: "INTERNAL_ERROR",
      reason: "DEPENDENCY_UNAVAILABLE",
      detail: "Email could not be sent.",
      requestId: "req_aaaa1111",
      status: 503,
    });

    expect(response.status).toBe(503);
  });
});
