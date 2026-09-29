import { queryOptions } from "@tanstack/react-query";
import {
  fallbackPublications,
  publicationFeedSchema,
  type Publication,
} from "@/data/publications";

/**
 * The live feed, read the same way the blog's is - straight off the default
 * branch on GitHub, so adding a paper to
 * `frontend-new/src/data/publications.json` there publishes it without a
 * rebuild, and the next deploy catches the bundled copy up.
 *
 * Set `VITE_PUBLICATIONS_URL` to read the feed from somewhere else (a different
 * branch while drafting, or the site's own origin).
 */
export const PUBLICATIONS_URL: string =
  import.meta.env.VITE_PUBLICATIONS_URL ??
  "https://raw.githubusercontent.com/Ethernal-Tech/apex-web/feat/skyline-web-redesign/frontend-new/src/data/publications.json";

export async function fetchPublications(): Promise<Publication[]> {
  const res = await fetch(PUBLICATIONS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load publications (${res.status})`);
  }
  // Parsed, not cast: this is a file anyone with commit rights can edit, so a
  // bad edit has to fail here and leave the bundled copy on screen.
  return publicationFeedSchema.parse(await res.json()).publications;
}

export const publicationsQueryOptions = queryOptions({
  queryKey: ["publications"] as const,
  queryFn: fetchPublications,
  initialData: fallbackPublications,
  // Without this the bundled copy would count as fresh and the live feed would
  // not be fetched at all for the first `staleTime`.
  initialDataUpdatedAt: 0,
  // raw.githubusercontent.com caches for five minutes, so asking more often
  // than that only repeats the same answer.
  staleTime: 5 * 60_000,
});
