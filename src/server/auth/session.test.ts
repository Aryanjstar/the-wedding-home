import { describe, expect, it } from "vitest";

import { randomToken, sessionCookieName, sessionCookieOptions, sha256Hex } from "@/server/auth/session";

describe("session cookie", () => {
  it("uses the host-prefixed name only on https", () => {
    expect(sessionCookieName("http://localhost:3000")).toBe("twh_session");
    expect(sessionCookieName("https://theweddinghome.example")).toBe("__Host-twh_session");
  });

  it("sets httpOnly, secure, lax, and a site-wide path", () => {
    expect(sessionCookieOptions("http://localhost:3000")).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});

describe("tokens", () => {
  it("creates a 32-byte base64url token and stores only its sha256", () => {
    const token = randomToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sha256Hex(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256Hex(token)).not.toBe(token);
  });
});
