import { createHash, createHmac, randomBytes } from "node:crypto";

const HOST_COOKIE = "__Host-twh_session";
const LOCAL_COOKIE = "twh_session";

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function tokenPepper(): string | null {
  const value = process.env.AUTH_TOKEN_PEPPER?.trim() ?? "";
  return value.length >= 32 ? value : null;
}

/** HMAC when AUTH_TOKEN_PEPPER is set. Older rows stay plain SHA-256 until they are rewritten. */
export function tokenHash(value: string): string {
  const pepper = tokenPepper();
  if (!pepper) return sha256Hex(value);
  return createHmac("sha256", pepper).update(value).digest("hex");
}

export function tokenHashQuery(value: string): string[] {
  const current = tokenHash(value);
  const plain = sha256Hex(value);
  return current === plain ? [plain] : [current, plain];
}

export function sessionCookieName(appUrl: string): string {
  return appUrl.startsWith("https://") ? HOST_COOKIE : LOCAL_COOKIE;
}

export function sessionCookieOptions(appUrl: string) {
  return {
    name: sessionCookieName(appUrl),
    httpOnly: true as const,
    secure: true as const,
    sameSite: "lax" as const,
    path: "/",
  };
}
