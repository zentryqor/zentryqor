import { supabase } from "@/integrations/supabase/client";

// Local typed wrapper: supabase.auth.oauth is beta and may not be in the SDK types.
export type OAuthAuthorization = {
  client?: { name?: string; redirect_uri?: string; client_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
export type OAuthResult = {
  data: OAuthAuthorization | null;
  error: { message: string } | null;
};

export const authOAuth = () =>
  (
    supabase.auth as unknown as {
      oauth: {
        getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
        approveAuthorization: (id: string) => Promise<OAuthResult>;
        denyAuthorization: (id: string) => Promise<OAuthResult>;
      };
    }
  ).oauth;
