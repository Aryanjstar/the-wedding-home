export function joinReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/join/") || value.startsWith("//") || value.includes("\\")) return undefined;
  return value;
}
