-- ==========================================
-- FIX: Make property-media bucket private
-- ==========================================
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property-media';

-- Drop old permissive policy
DROP POLICY IF EXISTS "Anyone can view property media" ON storage.objects;

-- Authenticated users can view property media
CREATE POLICY "Authenticated users can view property media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-media' 
  AND auth.uid() IS NOT NULL
);

-- Ensure upload/update/delete policies exist
DROP POLICY IF EXISTS "Authenticated users can upload property media" ON storage.objects;
CREATE POLICY "Authenticated users can upload property media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-media' 
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can update own property media" ON storage.objects;
CREATE POLICY "Users can update own property media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-media' 
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can delete own property media" ON storage.objects;
CREATE POLICY "Users can delete own property media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-media' 
  AND auth.uid() IS NOT NULL
);