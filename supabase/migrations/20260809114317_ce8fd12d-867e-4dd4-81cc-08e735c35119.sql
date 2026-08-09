CREATE TABLE public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_lower text NOT NULL,
  purpose text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_otps_lookup_idx ON public.email_otps (email_lower, purpose, created_at DESC);

GRANT ALL ON public.email_otps TO service_role;
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;