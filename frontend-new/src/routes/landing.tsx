import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { Landing } from "./index";

export const Route = createFileRoute("/landing")({
  head: () =>
    pageHead({
      title:
        "Skyline — The Universal Bridge for On-Chain and Real-World Finance",
      description:
        "Skyline connects every chain, agent, and dollar. Bridge assets instantly today — soon powering AI agents and traditional finance rails via Stripe and stablecoins.",
      path: "/",
      index: false,
    }),
  component: Landing,
});
