
CREATE TABLE public.post_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled series',
  cadence JSONB NOT NULL DEFAULT '{}'::jsonb,
  youtube_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  clip_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_series TO authenticated;
GRANT ALL ON public.post_series TO service_role;
ALTER TABLE public.post_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own series" ON public.post_series FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_post_series_user ON public.post_series(user_id, created_at DESC);

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.post_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_position INT;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_series ON public.scheduled_posts(series_id, series_position);
