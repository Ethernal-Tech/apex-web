import { z } from "zod";
import seed from "./publications.json";

/**
 * A publication is plain data so it can live in publications.json and be edited
 * on GitHub without a rebuild - see `publicationsQueryOptions`. There is no
 * page per publication: the list links straight out to wherever the paper is
 * published, so `doi` (or `url`) is the whole destination.
 */
export const publicationSchema = z.object({
  /** Only a React key and a JSON anchor - it never reaches a URL. */
  id: z.string().min(1),
  title: z.string().min(1),
  /** The journal, conference or proceedings it appeared in. */
  venue: z.string().min(1),
  /** Bare DOI, e.g. `10.1109/INFOTEH64129.2025.10959296` - not a URL. */
  doi: z.string().optional(),
  /** Where the row links when there is no DOI, or somewhere better than one. */
  url: z.string().optional(),
  authors: z.array(z.string()).default([]),
  /** The word on the tile: `Paper` for anything peer reviewed. */
  kind: z.string().default("Paper"),
});

export const publicationFeedSchema = z.object({
  publications: z.array(publicationSchema),
});

export type Publication = z.infer<typeof publicationSchema>;

/**
 * The copy of the feed that shipped with this build. It is what SSR and the
 * prerendered HTML render, what the page shows before the live feed arrives,
 * and what it keeps showing if that fetch fails. Parsed rather than cast, so a
 * malformed edit to the JSON fails here instead of in the browser.
 */
export const fallbackPublications: Publication[] =
  publicationFeedSchema.parse(seed).publications;

/** A DOI is the link as well as the citation, so one field covers both. */
export function publicationUrl(publication: Publication): string | undefined {
  if (publication.url) return publication.url;
  return publication.doi ? `https://doi.org/${publication.doi}` : undefined;
}
