import { describe, expect, it } from "vitest";

import { passwordProblem } from "@/data/password-rules";

describe("password rules", () => {
  it("asks for 10 to 128 characters and refuses a common password", () => {
    expect(passwordProblem("short")).toMatch(/10 to 128/);
    expect(passwordProblem("x".repeat(129))).toMatch(/10 to 128/);
    expect(passwordProblem("password123")).toMatch(/too common/);
    expect(passwordProblem("a-long-enough-secret")).toBeNull();
  });
});
