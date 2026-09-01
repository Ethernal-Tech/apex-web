import { z } from "zod";
import seed from "./blog-posts.json";

/**
 * A post is plain data so it can live in blog-posts.json and be edited on
 * GitHub without a rebuild - see `blogPostsQueryOptions`. `cover` is therefore
 * a URL rather than an imported asset: either site-relative (a file under
 * `public/`, e.g. `/blog-covers/bridge.webp`) or absolute, for an image hosted
 * anywhere else.
 */
export const blogPostSchema = z.object({
  /** Also the URL: `/blog/<slug>`. */
  slug: z.string().min(1),
  title: z.string().min(1),
  /** `YYYY-MM-DD`, read back in UTC so the rendered date cannot drift a day. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  summary: z.string(),
  cover: z.string().optional(),
  /** Empty for a decorative cover, which is the usual case. */
  coverAlt: z.string().default(""),
  /** One string per paragraph of the post body. */
  body: z.array(z.string()).default([]),
});

export const blogFeedSchema = z.object({ posts: z.array(blogPostSchema) });

export type BlogPost = z.infer<typeof blogPostSchema>;

/**
 * The copy of the feed that shipped with this build. It is what SSR and the
 * prerendered HTML render, what the page shows before the live feed arrives,
 * and what it keeps showing if that fetch fails. Parsed rather than cast, so a
 * malformed edit to the JSON fails here instead of in the browser.
 */
export const fallbackPosts: BlogPost[] = blogFeedSchema.parse(seed).posts;

export function getPost(
  posts: readonly BlogPost[],
  slug: string,
): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}
