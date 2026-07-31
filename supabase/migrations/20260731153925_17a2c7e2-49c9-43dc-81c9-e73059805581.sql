CREATE TABLE IF NOT EXISTS public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS push_devices_user_idx ON public.push_devices(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push devices" ON public.push_devices FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_assets boolean not null default true,
  ai_ready boolean not null default true,
  scheduled_posts boolean not null default true,
  credits boolean not null default true,
  referrals boolean not null default true,
  billing boolean not null default true,
  product_updates boolean not null default false,
  quiet_hours_start smallint,
  quiet_hours_end smallint,
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_preferences TO authenticated;
GRANT ALL ON public.push_preferences TO service_role;
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push preferences" ON public.push_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER push_preferences_touch BEFORE UPDATE ON public.push_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();