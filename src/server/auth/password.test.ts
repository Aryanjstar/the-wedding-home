import { describe, expect, it } from "vitest";

import { hashPassword, passwordCost, verifyPassword } from "@/server/auth/password";

describe("password", () => {
  it("hashes with bcrypt cost 12 and verifies", async () => {
    const passwordHash = await hashPassword("a-long-enough-secret");

    expect(passwordCost(passwordHash)).toBe(12);
    await expect(verifyPassword("a-long-enough-secret", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
  }, 20_000);
});
