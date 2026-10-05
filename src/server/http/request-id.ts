import { randomBytes } from "node:crypto";

export function createRequestId(): string {
  return `req_${randomBytes(4).toString("hex")}`;
}
