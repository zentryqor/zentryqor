import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Local typed wrapper: supabase.auth.oauth is beta and may not be in the SDK types.
type OAuthAuthorization = {
  client?: { name?: string; redirect_uri?: string; client_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthAuthorization | null; error: { message: string } | null };
const authOAuth = () =>
  (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
      approveAuthorization: (id: string) => Promise<OAuthResult>;
      denyAuthorization: (id: string) => Promise<OAuthResult>;
    };
  }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOAuth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 text-foreground">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-xl font-semibold">Could not load this authorization request</h1>
        <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";
  const redirectUri = details?.client?.redirect_uri;

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const res = approve
      ? await authOAuth().approveAuthorization(authorization_id)
      : await authOAuth().denyAuthorization(authorization_id);
    if (res.error) {
      setBusy(false);
      setError(res.error.message);
      return;
    }
    const target = res.data?.redirect_url ?? res.data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 py-10 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl space-y-5">
        <div className="space-y-1">
          <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase">Authorize</p>
          <h1 className="text-2xl font-semibold">Connect {clientName} to Zentry Qor</h1>
          <p className="text-sm text-muted-foreground">
            {clientName} will be able to call Zentry Qor's MCP tools while you are signed in.
          </p>
        </div>

        <ul className="text-sm space-y-2 rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <li>• Read your AI credit balance and plan</li>
          <li>• Generate AI text on your behalf (10 credits per call)</li>
          <li>• Generate AI images on your behalf (30 credits per call)</li>
        </ul>

        {redirectUri ? (
          <p className="text-[11px] text-muted-foreground break-all">
            Redirects to: <span className="font-mono">{redirectUri}</span>
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          This does not bypass Zentry Qor's own permissions or backend policies.
        </p>

        {error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Cancel connection
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? "Working…" : "Approve"}
          </Button>
        </div>
      </div>
    </main>
  );
}
