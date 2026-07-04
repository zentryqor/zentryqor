
-- batch_jobs
CREATE TABLE public.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('text','image')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','canceled')),
  total INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  aspect_ratio TEXT,
  system_prompt TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_jobs TO authenticated;
GRANT ALL ON public.batch_jobs TO service_role;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own batches read"   ON public.batch_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own batches insert" ON public.batch_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own batches update" ON public.batch_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own batches delete" ON public.batch_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_batch_jobs_updated BEFORE UPDATE ON public.batch_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_batch_jobs_user_created ON public.batch_jobs (user_id, created_at DESC);
CREATE INDEX idx_batch_jobs_status ON public.batch_jobs (status) WHERE status IN ('queued','running');

-- batch_items
CREATE TABLE public.batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batch_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed','skipped')),
  output_text TEXT,
  output_image TEXT,
  credits_cost INTEGER,
  generation_id UUID,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_items TO authenticated;
GRANT ALL ON public.batch_items TO service_role;
ALTER TABLE public.batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items read"   ON public.batch_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own items insert" ON public.batch_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own items update" ON public.batch_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own items delete" ON public.batch_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_batch_items_updated BEFORE UPDATE ON public.batch_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_batch_items_batch_pos ON public.batch_items (batch_id, position);
CREATE INDEX idx_batch_items_pending ON public.batch_items (batch_id) WHERE status = 'pending';

-- scheduled_jobs
CREATE TABLE public.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('text','image')),
  prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  system_prompt TEXT,
  aspect_ratio TEXT,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','hourly')),
  hour_utc INTEGER NOT NULL DEFAULT 9 CHECK (hour_utc BETWEEN 0 AND 23),
  weekday INTEGER CHECK (weekday BETWEEN 0 AND 6),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_jobs TO authenticated;
GRANT ALL ON public.scheduled_jobs TO service_role;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sched read"   ON public.scheduled_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sched insert" ON public.scheduled_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sched update" ON public.scheduled_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sched delete" ON public.scheduled_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_scheduled_jobs_updated BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_scheduled_jobs_active_next ON public.scheduled_jobs (active, next_run_at);
