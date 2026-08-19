import { useState } from "react";

import { UNKNOWN_ICON_URL } from "@/lib/assetIcons";

/**
 * A chain or token logo that survives a `src` it cannot load.
 *
 * Logos come from the web-api's /icons directory, named by the chainInfos and
 * tokenInfos configs, so the URL is only as good as the config: a file name with
 * nothing behind it 404s, and a config-supplied `iconUrl` can point at a host
 * that is down, blocked, or serving the wrong content type. Without this the
 * result is a broken-image glyph; with it the bundled unknown logo shows instead.
 */
export function AssetIcon({
  src,
  alt,
  className,
  fallback = UNKNOWN_ICON_URL,
  ...rest
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
} & Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "className" | "onError"
>) {
  /**
   * The src that failed, rather than a bare "failed" flag: the same element is
   * reused as the selection changes, and a flag would keep showing the fallback
   * for a perfectly good next logo.
   */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <img
      src={failedSrc === src ? fallback : src}
      alt={alt}
      className={className}
      // guarded so a fallback that somehow fails cannot loop
      onError={() => {
        if (src !== fallback) setFailedSrc(src);
      }}
      {...rest}
    />
  );
}
