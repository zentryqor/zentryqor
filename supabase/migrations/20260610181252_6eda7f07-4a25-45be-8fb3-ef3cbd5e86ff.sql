DROP POLICY IF EXISTS "Users manage own credit usage" ON public.ai_credit_usage;
CREATE POLICY "Users read own credit usage" ON public.ai_credit_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
CREATE POLICY "Authenticated users can view assets" ON public.assets FOR SELECT TO authenticated USING ((NOT premium_only) OR public.is_premium(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read asset files" ON storage.objects;
CREATE POLICY "Authenticated can read asset files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'assets' AND (public.is_premium(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role) OR NOT EXISTS (SELECT 1 FROM public.assets a WHERE a.storage_path = storage.objects.name AND a.premium_only = true)));