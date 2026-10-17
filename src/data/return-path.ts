/** Only our own pages: an invitation to join, or a page inside the family app. Never another site. */
export function joinReturnPath(value: string | undefined) {
  if (!value || value.startsWith("//") || value.includes("\\") || value.includes("://")) return undefined;
  if (value.startsWith("/join/") || value === "/app" || value.startsWith("/app/")) return value;
  return undefined;
}
