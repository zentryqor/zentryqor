import { useCallback, useEffect, useState } from "react";
import { appwriteGetUser, appwriteSignOut, type AppwriteUser } from "@/lib/appwrite";

/**
 * Appwrite session state (phase 1 of the backend migration). Runs only in the
 * browser; the Appwrite SDK stores its session in cookies/localStorage.
 */
export function useAppwriteAuth() {
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await appwriteGetUser();
    setUser(u);
    setLoading(false);
    return u;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await appwriteSignOut();
    setUser(null);
  }, []);

  return { user, loading, refresh, signOut };
}
