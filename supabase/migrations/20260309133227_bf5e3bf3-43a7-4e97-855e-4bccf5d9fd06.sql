
-- Drop the existing permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a restrictive update policy that prevents modification of sensitive fields
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND kyc_verified IS NOT DISTINCT FROM (SELECT p.kyc_verified FROM public.profiles p WHERE p.user_id = auth.uid())
  AND kyc_data IS NOT DISTINCT FROM (SELECT p.kyc_data FROM public.profiles p WHERE p.user_id = auth.uid())
  AND avg_rating IS NOT DISTINCT FROM (SELECT p.avg_rating FROM public.profiles p WHERE p.user_id = auth.uid())
  AND total_reviews IS NOT DISTINCT FROM (SELECT p.total_reviews FROM public.profiles p WHERE p.user_id = auth.uid())
  AND reputation_badges IS NOT DISTINCT FROM (SELECT p.reputation_badges FROM public.profiles p WHERE p.user_id = auth.uid())
);
