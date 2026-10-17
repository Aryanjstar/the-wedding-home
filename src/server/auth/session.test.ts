import { describe, expect, it } from "vitest";

import { randomToken, sessionCookieName, sessionCookieOptions, sha256Hex, tokenHash, tokenHashQuery } from "@/server/auth/session";

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

  it("peppers new hashes and still recognises the older sha256", () => {
    const previous = process.env.AUTH_TOKEN_PEPPER;
    process.env.AUTH_TOKEN_PEPPER = "pepper-pepper-pepper-pepper-pepper-32";
    const token = randomToken();
    expect(tokenHash(token)).not.toBe(sha256Hex(token));
    expect(tokenHashQuery(token)).toEqual([tokenHash(token), sha256Hex(token)]);
    if (previous === undefined) delete process.env.AUTH_TOKEN_PEPPER;
    else process.env.AUTH_TOKEN_PEPPER = previous;
  });
});
