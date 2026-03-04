-- Fix storage policies: scope UPDATE/DELETE to owner's folder only
DROP POLICY IF EXISTS "Users can update own property media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own property media" ON storage.objects;

CREATE POLICY "Users can update own property media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own property media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);