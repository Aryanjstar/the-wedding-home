import { compare, getRounds, hash } from "bcryptjs";

/** Pure-JS bcrypt. Argon2id stays deferred until a native module is proven on Vercel. */
export const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export function passwordCost(passwordHash: string): number {
  return getRounds(passwordHash);
}
