import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { pageHead } from "@/lib/seo";
import { type BlogPost } from "@/data/blog";
import { blogPostsQueryOptions } from "@/lib/api/blog";
import { fmtPostDate } from "@/lib/blog-date";

export const Route = createFileRoute("/blog/")({
  head: () =>
    pageHead({
      title: "Blog - Skyline",
      description:
        "Notes from the team building Skyline: what we ship, how the bridge routes value between chains, agents and fiat rails, and what we are working on next.",
      path: "/blog",
    }),
  component: BlogIndex,
});

/**
 * One size for every cover, in both the featured row and the grid below it, so
 * the list reads as one set of cards rather than one big card and two small.
 * 3:2 is the covers' own ratio - anything else throws away part of the frame -
 * and the widths are the largest the two layouts can share at each breakpoint.
 * Below `md` both stack, so there a cover is as wide as the panel.
 */
const COVER_CLASS =
  "aspect-[3/2] w-full max-w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors group-hover:border-[oklch(0.72_0.19_245_/_0.5)] md:w-[300px] lg:w-[380px]";

function Cover({ post }: { post: BlogPost }) {
  return (
    <div className={COVER_CLASS}>
      {post.cover ? (
        <img
          src={post.cover}
          alt={post.coverAlt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        // A post published without a cover still gets the same box, so one
        // missing image cannot knock the row out of alignment.
        <div className="h-full w-full bg-gradient-to-br from-[oklch(0.28_0.05_262)] to-[oklch(0.16_0.03_260)]" />
      )}
    </div>
  );
}

function PostDate({ post }: { post: BlogPost }) {
  return (
    <time
      dateTime={post.date}
      className="block text-xs uppercase tracking-wider text-muted-foreground"
    >
      {fmtPostDate(post.date)}
    </time>
  );
}

const TITLE_CLASS =
  "text-balance font-display font-semibold text-foreground transition-colors group-hover:text-[oklch(0.85_0.15_235)]";

/** The lead post: cover beside the copy, on one wide row. */
function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <article>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="group flex flex-col gap-5 md:flex-row md:items-center md:gap-7"
      >
        <Cover post={post} />
        <div className="min-w-0">
          <PostDate post={post} />
          <h2 className={`mt-2 text-2xl md:text-3xl ${TITLE_CLASS}`}>
            {post.title}
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            {post.summary}
          </p>
        </div>
      </Link>
    </article>
  );
}

/** Everything after the lead post: cover on top, copy under it. */
function PostCard({ post }: { post: BlogPost }) {
  return (
    <article>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="group block"
      >
        <Cover post={post} />
        <div className="mt-4">
          <PostDate post={post} />
          <h2 className={`mt-2 text-lg ${TITLE_CLASS}`}>{post.title}</h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            {post.summary}
          </p>
        </div>
      </Link>
    </article>
  );
}

function BlogIndex() {
  const { data: posts } = useQuery(blogPostsQueryOptions);
  const [featured, ...rest] = posts;

  if (!featured) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        The first post is on its way.
      </p>
    );
  }

  return (
    <>
      <FeaturedPost post={featured} />
      {rest.length > 0 && (
        <>
          <div className="my-8 border-t border-white/5 md:my-10" />
          <div className="grid gap-8 md:grid-cols-2">
            {rest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
