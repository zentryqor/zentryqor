
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages pending signups"
  ON public.pending_signups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
