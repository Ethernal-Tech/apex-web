export function readReturnTo(
  search: Record<string, unknown>,
): string | undefined {
  const raw = search.returnTo;
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return undefined;
}
