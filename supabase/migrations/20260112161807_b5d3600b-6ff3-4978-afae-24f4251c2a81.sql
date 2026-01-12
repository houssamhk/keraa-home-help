-- Fix profiles_table_public_exposure: Update RESTRICTIVE policy to only allow active contracts

-- Drop the old RESTRICTIVE policy that still allows completed/signed contracts
DROP POLICY IF EXISTS "Restrict profile access to authenticated relationships only" ON public.profiles;

-- Create updated RESTRICTIVE policy - ONLY active contracts, not completed/signed
CREATE POLICY "Restrict profile access to authenticated relationships only"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- User viewing their own profile
    auth.uid() = user_id
    OR
    -- Admin access
    public.has_role(auth.uid(), 'admin')
    OR
    -- Contract party access - ONLY ACTIVE contracts
    EXISTS (
      SELECT 1 FROM public.contracts ct
      WHERE ct.status = 'active'
      AND (
        (ct.landlord_id = auth.uid() AND (ct.tenant_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
        OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
        OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.tenant_id = profiles.user_id))
      )
    )
  )
);

-- Ensure RLS is forced for all roles including table owner
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Revoke direct access from public and anon roles
REVOKE ALL ON public.profiles FROM public;
REVOKE ALL ON public.profiles FROM anon;

-- Grant only to authenticated users (RLS will still apply)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

COMMENT ON TABLE public.profiles IS 'User profiles with PII. SECURITY: RLS enabled and FORCED. Access restricted to: own profile, active contract parties, admins. Phone via get_safe_profile() for active contracts only. No public/anon access.';