import { queryOptions } from "@tanstack/react-query";
import { blogFeedSchema, fallbackPosts, type BlogPost } from "@/data/blog";

/**
 * The live feed. It is the very file this build shipped with, read straight off
 * the default branch on GitHub - so editing `frontend-new/src/data/blog-posts.json`
 * there publishes a post without a rebuild, and the next deploy simply catches
 * the bundled copy up.
 *
 * Set `VITE_BLOG_POSTS_URL` to read the feed from somewhere else (a different
 * branch while drafting, or the site's own origin).
 */
export const BLOG_POSTS_URL: string =
  import.meta.env.VITE_BLOG_POSTS_URL ??
  "https://raw.githubusercontent.com/Ethernal-Tech/apex-web/feat/skyline/frontend-new/src/data/blog-posts.json";

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  const res = await fetch(BLOG_POSTS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load blog posts (${res.status})`);
  }
  // Parsed, not cast: this is a file anyone with commit rights can edit, so a
  // bad edit has to fail here and leave the bundled copy on screen.
  return blogFeedSchema.parse(await res.json()).posts;
}

export const blogPostsQueryOptions = queryOptions({
  queryKey: ["blog-posts"] as const,
  queryFn: fetchBlogPosts,
  initialData: fallbackPosts,
  // Without this the bundled copy would count as fresh and the live feed would
  // not be fetched at all for the first `staleTime`.
  initialDataUpdatedAt: 0,
  // raw.githubusercontent.com caches for five minutes, so asking more often
  // than that only repeats the same answer.
  staleTime: 5 * 60_000,
});
