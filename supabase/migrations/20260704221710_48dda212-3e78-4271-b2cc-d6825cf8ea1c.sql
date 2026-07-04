
CREATE TABLE public.status_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('up','down','degraded')),
  latency_ms INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX status_checks_service_created_at_idx ON public.status_checks (service, created_at DESC);

GRANT SELECT ON public.status_checks TO anon, authenticated;
GRANT ALL ON public.status_checks TO service_role;

ALTER TABLE public.status_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status checks are publicly readable"
  ON public.status_checks FOR SELECT
  USING (true);
