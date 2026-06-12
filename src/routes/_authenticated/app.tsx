import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy entry point — redirect to the real authenticated home.
export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
