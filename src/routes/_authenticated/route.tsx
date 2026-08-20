import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { appwriteGetUser } from "@/lib/appwrite";
import { WorkspaceDock } from "@/components/WorkspaceDock";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await appwriteGetUser();
    if (!user) throw redirect({ to: "/auth", search: { redirect: location.href } });
    return { user };
  },
  component: AuthenticatedLayout,
});


function AuthenticatedLayout() {
  return (
    <>
      <Outlet />
      <WorkspaceDock />
    </>
  );
}
