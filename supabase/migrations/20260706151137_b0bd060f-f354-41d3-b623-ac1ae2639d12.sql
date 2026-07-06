
CREATE POLICY "social-uploads own read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'social-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "social-uploads own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "social-uploads own update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'social-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "social-uploads own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'social-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
