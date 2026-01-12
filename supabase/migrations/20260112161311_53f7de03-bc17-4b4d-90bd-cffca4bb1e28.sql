-- Fix profiles_anonymous_exposure: Remove ineffective deny policy and strengthen authentication check

-- Drop the ineffective RESTRICTIVE policy for anon role
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Drop and recreate the restrictive policy with explicit authentication check
DROP POLICY IF EXISTS "Restrict profile access to defined relationships" ON public.profiles;

CREATE POLICY "Restrict profile access to authenticated relationships only"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  -- MUST be authenticated (explicit check)
  auth.uid() IS NOT NULL
  AND (
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
  )
);

-- Revoke any direct table access from anon role
REVOKE ALL ON public.profiles FROM anon;

-- Ensure only authenticated role has access
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Update comment
COMMENT ON TABLE public.profiles IS 'User profiles with PII. SECURITY: Only authenticated users can access via RESTRICTIVE RLS. Access limited to: own profile, verified contract parties, admins. Anonymous access completely revoked at table level.';