import { createHash, randomBytes } from "node:crypto";

const HOST_COOKIE = "__Host-twh_session";
const LOCAL_COOKIE = "twh_session";

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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
