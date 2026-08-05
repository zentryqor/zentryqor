import { createFileRoute } from "@tanstack/react-router";
import { AssetsScreen } from "@/screens/assets";

export const Route = createFileRoute("/_authenticated/assets/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Vault — Zentry Qor" }] }),
  component: AssetsScreen,
});
