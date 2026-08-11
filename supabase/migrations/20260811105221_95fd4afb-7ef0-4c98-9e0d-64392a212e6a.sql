CREATE POLICY "own caption project files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'caption-projects' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'caption-projects' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own caption font files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'caption-fonts' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'caption-fonts' AND (storage.foldername(name))[1] = auth.uid()::text);