-- Fix profiles_missing_public_rls: Add RESTRICTIVE policy to prevent broad access
-- This ensures that only specific relationship-based access is allowed

-- First, let's add a RESTRICTIVE policy that requires one of the allowed conditions
-- RESTRICTIVE policies work as AND with PERMISSIVE policies - ALL restrictive must pass

-- Create a RESTRICTIVE policy that acts as a gatekeeper
-- This ensures users can ONLY access profiles through defined pathways
CREATE POLICY "Restrict profile access to defined relationships"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  -- User viewing their own profile
  auth.uid() = user_id
  OR
  -- Admin access
  public.has_role(auth.uid(), 'admin')
  OR
  -- Contract party access (verified contracts only)
  EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.status = ANY (ARRAY['active', 'completed', 'signed'])
    AND (
      (ct.landlord_id = auth.uid() AND (ct.tenant_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
      OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
      OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.tenant_id = profiles.user_id))
    )
  )
);

-- Also ensure anonymous users have NO access at all
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add comment documenting the security model
COMMENT ON TABLE public.profiles IS 'User profiles with PII. SECURITY: Access restricted via RESTRICTIVE RLS policies. Users can only view: (1) their own profile, (2) profiles of verified contract parties, (3) admins can view all. Phone numbers require active contract relationship via get_safe_profile(). Anonymous access denied.';