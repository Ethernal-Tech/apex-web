import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/[0.07]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-skeleton-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/[0.16] after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Inline shimmer bar that sits where a number or short label will land.
 * Height follows the surrounding text (`1em`); pass `className` for width.
 */
function ValueSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "relative inline-block h-[0.8em] w-[4.5em] overflow-hidden rounded-md bg-white/[0.07] align-middle",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-skeleton-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/[0.16] after:to-transparent",
        className,
      )}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}

export { Skeleton, ValueSkeleton };
