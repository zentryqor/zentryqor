import { createServerFn } from "@tanstack/react-start";

/**
 * Reports whether the Appwrite backend credentials are configured and the
 * project responds. Safe to call from the app: returns no secret values.
 */
export const getAppwriteStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { appwriteJson } = await import("@/lib/appwrite.server");
  const configured =
    !!process.env.APPWRITE_ENDPOINT &&
    !!process.env.APPWRITE_PROJECT_ID &&
    !!process.env.APPWRITE_API_KEY;
  if (!configured) return { configured: false, reachable: false, message: "Not configured" };
  try {
    const health = await appwriteJson<{ status: string }>("/health");
    return { configured: true, reachable: health.status === "pass", message: health.status };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
});
