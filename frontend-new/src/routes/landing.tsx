import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "./index";

export const Route = createFileRoute("/landing")({
  component: Landing,
});
