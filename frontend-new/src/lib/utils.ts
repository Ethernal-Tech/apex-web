import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SKYLINE_DOCUMENTATION_URL =
  "https://ethernal-6.gitbook.io/skyline";

export const ETHERNAL_GITHUB_URL = "https://github.com/Ethernal-Tech";

/** Open http(s) links in a new tab. Internal paths and hashes stay in-place. */
export function externalAnchorProps(href: string) {
  if (!/^https?:\/\//.test(href)) return {};
  return { target: "_blank" as const, rel: "noopener noreferrer" };
}
