import { useCallback, useEffect, useState } from "react";
import { appwriteGetUser, appwriteSignOut, type AppwriteUser } from "@/lib/appwrite";
import { clearAppwriteAuthCache } from "@/integrations/appwrite/auth-attacher";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

function mapUser(u: AppwriteUser | null): AuthUser | null {
  if (!u) return null;
  return {
    id: u.$id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerification,
  };
}

/**
 * Session state backed by the new backend (Appwrite). Shape is kept
 * compatible with the previous hook: consumers read `user.id` / `user.email`.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = mapUser(await appwriteGetUser());
    setUser(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await appwriteSignOut();
    clearAppwriteAuthCache();
    setUser(null);
  }, []);

  return { user, session: user ? { user } : null, loading, refresh, signOut };
}
