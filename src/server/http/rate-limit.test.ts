import { describe, expect, it } from "vitest";

import { rateLimitKey } from "@/server/http/rate-limit";

describe("rate limit keys", () => {
  it("does not store the email or address in the document id", () => {
    const id = rateLimitKey("secret-at-least-32-characters-long", "forgot-email", "parent@example.com", 1_700_000_000_000);
    expect(id).not.toContain("parent@example.com");
    expect(id).not.toContain("example.com");
    expect(id.endsWith(":1700000000000")).toBe(true);
  });
});
