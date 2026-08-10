CREATE TABLE public.export_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  resolution TEXT NOT NULL DEFAULT 'source',
  bitrate_mbps INTEGER NOT NULL DEFAULT 6,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_settings TO authenticated;
GRANT ALL ON public.export_settings TO service_role;

ALTER TABLE public.export_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own export settings"
ON public.export_settings FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER export_settings_touch_updated_at
BEFORE UPDATE ON public.export_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();