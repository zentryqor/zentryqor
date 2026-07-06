
-- Enums
DO $$ BEGIN
  CREATE TYPE public.social_platform AS ENUM ('tiktok','instagram','youtube');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scheduled_post_status AS ENUM ('draft','queued','publishing','published','failed','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scheduled_target_status AS ENUM ('pending','publishing','published','failed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- social_accounts (tokens live here; only service_role can read)
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  platform_user_id text NOT NULL,
  handle text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, platform_user_id)
);

-- No grants to authenticated — clients must go through the view.
GRANT ALL ON public.social_accounts TO service_role;

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Owner may see rows (through the view; direct SELECT blocked by no grant)
CREATE POLICY "own social_accounts read"
  ON public.social_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role writes tokens; RLS still keeps rows scoped
CREATE POLICY "service writes social_accounts"
  ON public.social_accounts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER social_accounts_touch
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Safe view for the client (no tokens)
CREATE OR REPLACE VIEW public.social_accounts_public
WITH (security_invoker = true)
AS
SELECT id, user_id, platform, platform_user_id, handle, expires_at,
       scopes, meta, connected_at, revoked_at, updated_at
FROM public.social_accounts;

GRANT SELECT ON public.social_accounts_public TO authenticated;

-- scheduled_posts
CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text NOT NULL DEFAULT '',
  video_path text,
  thumbnail_path text,
  scheduled_for timestamptz NOT NULL,
  status public.scheduled_post_status NOT NULL DEFAULT 'draft',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own scheduled_posts"
  ON public.scheduled_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER scheduled_posts_touch
BEFORE UPDATE ON public.scheduled_posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX scheduled_posts_due_idx
  ON public.scheduled_posts (scheduled_for)
  WHERE status IN ('queued','publishing');

-- scheduled_post_targets (fan-out per platform)
CREATE TABLE public.scheduled_post_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform_post_id text,
  status public.scheduled_target_status NOT NULL DEFAULT 'pending',
  error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheduled_post_id, platform)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_post_targets TO authenticated;
GRANT ALL ON public.scheduled_post_targets TO service_role;

ALTER TABLE public.scheduled_post_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own scheduled_post_targets"
  ON public.scheduled_post_targets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER scheduled_post_targets_touch
BEFORE UPDATE ON public.scheduled_post_targets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX scheduled_post_targets_post_idx
  ON public.scheduled_post_targets (scheduled_post_id);
