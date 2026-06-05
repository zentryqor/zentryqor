
CREATE TABLE public.thumbnail_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT ON public.thumbnail_usage TO authenticated;
GRANT ALL ON public.thumbnail_usage TO service_role;

ALTER TABLE public.thumbnail_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own thumbnail usage"
  ON public.thumbnail_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
