
CREATE TABLE public.pending_signups (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  display_name text,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pending_signups TO service_role;
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (bypasses RLS) may access this table.
