-- Create RLS policies for kyc-documents bucket
-- This bucket is already private (is_public = false), but we need proper access policies

-- Policy 1: Users can upload their own KYC documents
CREATE POLICY "Users can upload own KYC documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can view their own KYC documents
CREATE POLICY "Users can view own KYC documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can update their own KYC documents
CREATE POLICY "Users can update own KYC documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own KYC documents
CREATE POLICY "Users can delete own KYC documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: Admins can view all KYC documents (for verification)
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Policy 6: Admins can manage all KYC documents
CREATE POLICY "Admins can manage KYC documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'kyc-documents' 
  AND public.has_role(auth.uid(), 'admin')
);