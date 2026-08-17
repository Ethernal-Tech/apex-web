export type HistoryView = "world" | "user";

export type ReturnTarget =
  | { to: "/bridge-app" }
  | { to: "/transactions"; search?: { view?: HistoryView } };

export function readReturnTo(
  search: Record<string, unknown>,
): string | undefined {
  const raw = search.returnTo;
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return undefined;
}

export function parseReturnTo(returnTo: string | undefined): ReturnTarget {
  if (!returnTo) return { to: "/bridge-app" };
  const qIndex = returnTo.indexOf("?");
  const path = qIndex === -1 ? returnTo : returnTo.slice(0, qIndex);
  const query = qIndex === -1 ? "" : returnTo.slice(qIndex + 1);
  if (path === "/transactions") {
    const view = new URLSearchParams(query).get("view");
    if (view === "user" || view === "world") {
      return { to: "/transactions", search: { view } };
    }
    return { to: "/transactions" };
  }
  return { to: "/bridge-app" };
}

export function historyReturnTo(view: HistoryView): string {
  return `/transactions?view=${view}`;
}
