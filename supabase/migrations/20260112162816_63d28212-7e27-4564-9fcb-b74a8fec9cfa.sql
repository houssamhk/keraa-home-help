-- Fix profiles_table_public_exposure: Remove overly permissive authenticated check

-- Drop the existing restrictive policy that has the vulnerability
DROP POLICY IF EXISTS "Restrict direct profile access to owner and admins only" ON public.profiles;

-- Create a more secure restrictive policy that ONLY allows owner or admin
-- Remove the unnecessary auth.uid() IS NOT NULL check that was redundant
CREATE POLICY "Restrict direct profile access to owner and admins only"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  -- ONLY owner can view their own profile OR admin role
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Document the security fix
COMMENT ON POLICY "Restrict direct profile access to owner and admins only" ON public.profiles 
IS 'RESTRICTIVE policy: Only the profile owner or admins can access profile data directly. Contract partners must use contract_partner_profiles view. Phone access requires mutual consent via get_safe_profile().';