GRANT SELECT, INSERT, UPDATE ON public.ai_credit_usage TO authenticated;
GRANT ALL ON public.ai_credit_usage TO service_role;

CREATE POLICY "Users insert own credit usage"
ON public.ai_credit_usage FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own credit usage"
ON public.ai_credit_usage FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);