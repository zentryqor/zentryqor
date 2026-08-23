import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppwriteAuth } from "@/integrations/appwrite/auth-middleware";

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(60, "Display name must be 60 characters or fewer")
  .regex(/^[\p{L}\p{N} ._'\-]+$/u, "Display name contains invalid characters");

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireAppwriteAuth])
  .inputValidator((d) =>
    z
      .object({
        display_name: displayNameSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sanitizeUserText, enforceRateLimit, RateLimitError } = await import(
      "@/lib/security.server"
    );
    try {
      await enforceRateLimit(
        `profile-update:${context.userId}`,
        20,
        60,
        "Too many profile updates",
      );
    } catch (e) {
      if (e instanceof RateLimitError) throw new Error(e.message);
      throw e;
    }

    const safeName = sanitizeUserText(data.display_name, 60);
    if (!safeName) throw new Error("Display name is required");

    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: safeName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, display_name: safeName };
  });
