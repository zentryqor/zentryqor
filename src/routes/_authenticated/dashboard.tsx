import { createFileRoute } from "@tanstack/react-router";
import { DashboardScreen } from "@/screens/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zentry Qor" }] }),
  component: DashboardScreen,
});
