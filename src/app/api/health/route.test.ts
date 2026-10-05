import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports the process is up", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Request-Id")).toMatch(/^req_[0-9a-f]{8}$/);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
