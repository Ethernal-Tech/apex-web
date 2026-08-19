import appSettings from "@/settings/appSettings";

const OG_IMAGE_PATH = "/og.png";

function absoluteUrl(path: string): string {
  const origin = appSettings.siteUrl.replace(/\/$/, "");
  if (path === "/" || path === "") return `${origin}/`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * One place for the tags crawlers and chat-app previews actually read.
 * `path` is the site path (e.g. `/audit`), not a full URL — siteUrl comes from settings.
 */
export function pageHead({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}) {
  const url = absoluteUrl(path);
  const image = absoluteUrl(OG_IMAGE_PATH);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: index ? "index, follow" : "noindex, nofollow",
      },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
