-- ==========================================
-- FIX 1: Clean up redundant/conflicting profiles SELECT policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- ==========================================
-- FIX 2: Add admin access to payment-proofs storage
-- ==========================================
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);
