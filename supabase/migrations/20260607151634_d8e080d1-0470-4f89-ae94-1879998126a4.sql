
CREATE TABLE public.asset_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);
CREATE INDEX asset_saves_user_recent ON public.asset_saves(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_saves TO authenticated;
GRANT ALL ON public.asset_saves TO service_role;
ALTER TABLE public.asset_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saves" ON public.asset_saves
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.asset_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_downloads_user_recent ON public.asset_downloads(user_id, created_at DESC);
CREATE INDEX asset_downloads_asset ON public.asset_downloads(asset_id);
GRANT SELECT, INSERT ON public.asset_downloads TO authenticated;
GRANT ALL ON public.asset_downloads TO service_role;
ALTER TABLE public.asset_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own downloads" ON public.asset_downloads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own downloads" ON public.asset_downloads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
