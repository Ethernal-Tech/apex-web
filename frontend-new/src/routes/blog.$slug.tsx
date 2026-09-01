import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { pageHead } from "@/lib/seo";
import { fallbackPosts, getPost } from "@/data/blog";
import { blogPostsQueryOptions } from "@/lib/api/blog";
import { fmtPostDate } from "@/lib/blog-date";

export const Route = createFileRoute("/blog/$slug")({
  // Head tags are resolved before any fetch, so they can only describe a post
  // this build shipped with. A post added to the live feed since then still
  // renders - it just carries the generic blog description until the next
  // deploy, with its title patched in by the component once the feed arrives.
  head: ({ params }) => {
    const post = getPost(fallbackPosts, params.slug);
    return pageHead({
      title: post ? `${post.title} - Skyline Blog` : "Skyline Blog",
      description:
        post?.summary ??
        "Notes from the team building Skyline: what we ship and what we are working on next.",
      path: `/blog/${params.slug}`,
    });
  },
  component: BlogPostPage,
});

function BackToPosts() {
  return (
    <Link
      to="/blog"
      className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" /> All posts
    </Link>
  );
}

function BlogPostPage() {
  const { slug } = Route.useParams();
  const { data: posts, isFetching } = useQuery(blogPostsQueryOptions);
  const post = getPost(posts, slug);

  // Covers the post that exists only in the live feed: `head` could not know
  // its title, so set it here once the feed has been read.
  useEffect(() => {
    if (post && !getPost(fallbackPosts, slug)) {
      document.title = `${post.title} - Skyline Blog`;
    }
  }, [post, slug]);

  if (!post) {
    // The bundled feed renders first, so a post published since this build
    // looks missing until the live one lands. Say nothing until it has.
    if (isFetching) {
      return (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Loading the post…
        </p>
      );
    }
    return (
      <div className="py-6 text-center">
        <h2 className="font-display text-xl font-semibold text-foreground">
          We could not find that post
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          The link may be out of date, or the post may have moved.
        </p>
        <div className="mt-6 flex justify-center">
          <BackToPosts />
        </div>
      </div>
    );
  }

  return (
    <article>
      <BackToPosts />
      <time
        dateTime={post.date}
        className="mt-6 block text-xs uppercase tracking-wider text-muted-foreground"
      >
        {fmtPostDate(post.date)}
      </time>
      <h2 className="mt-2 text-balance font-display text-2xl font-semibold text-foreground md:text-4xl">
        {post.title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
        {post.summary}
      </p>
      {post.cover && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <img
            src={post.cover}
            alt={post.coverAlt}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      )}
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
        {post.body.map((paragraph) => (
          <p key={paragraph} className="text-pretty">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
