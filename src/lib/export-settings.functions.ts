import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SettingsSchema = z.object({
  resolution: z.enum(["source", "1080", "720", "480"]),
  bitrateMbps: z.number().int().min(1).max(16),
});

export type ExportSettings = z.infer<typeof SettingsSchema>;

/** Last-used caption video export settings for the signed-in user. */
export const getExportSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExportSettings> => {
    const { data } = await context.supabase
      .from("export_settings")
      .select("resolution, bitrate_mbps")
      .eq("user_id", context.userId)
      .maybeSingle();

    const parsed = SettingsSchema.safeParse({
      resolution: data?.resolution,
      bitrateMbps: data?.bitrate_mbps,
    });
    return parsed.success ? parsed.data : { resolution: "source", bitrateMbps: 6 };
  });

export const saveExportSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("export_settings").upsert(
      {
        user_id: context.userId,
        resolution: data.resolution,
        bitrate_mbps: data.bitrateMbps,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
