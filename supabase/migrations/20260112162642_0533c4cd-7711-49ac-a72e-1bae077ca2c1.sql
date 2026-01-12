-- Fix profiles_table_sensitive_exposure: Remove direct access to sensitive columns

-- Drop existing contract-based SELECT policies that expose all columns
DROP POLICY IF EXISTS "Users can view active contract party profiles" ON public.profiles;

-- Update the RESTRICTIVE policy to only allow own profile and admins (not contract parties)
DROP POLICY IF EXISTS "Restrict profile access to authenticated relationships only" ON public.profiles;

CREATE POLICY "Restrict direct profile access to owner and admins only"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- User viewing their own profile only
    auth.uid() = user_id
    OR
    -- Admin access
    public.has_role(auth.uid(), 'admin')
  )
  -- NO contract-based access to raw table - must use safe views/functions
);

-- Create a SAFE view for contract partners that EXCLUDES sensitive fields
DROP VIEW IF EXISTS public.contract_partner_profiles;

CREATE VIEW public.contract_partner_profiles
WITH (security_invoker = true)
AS
SELECT 
  p.user_id,
  p.full_name,
  p.avatar_url,
  p.avg_rating,
  p.total_reviews,
  p.reputation_badges,
  p.role_type,
  p.kyc_verified
  -- EXCLUDED: phone, kyc_data, settings (sensitive fields)
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.contracts ct
  WHERE ct.status = 'active'
  AND (
    (ct.landlord_id = auth.uid() AND (ct.tenant_id = p.user_id OR ct.handyman_id = p.user_id))
    OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = p.user_id OR ct.handyman_id = p.user_id))
    OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = p.user_id OR ct.tenant_id = p.user_id))
  )
);

-- Revoke all access and grant only to authenticated
REVOKE ALL ON public.contract_partner_profiles FROM public;
REVOKE ALL ON public.contract_partner_profiles FROM anon;
GRANT SELECT ON public.contract_partner_profiles TO authenticated;

-- Ensure kyc_data is NEVER accessible except through secure function
-- Update get_profile_kyc_data to be more secure
CREATE OR REPLACE FUNCTION public.get_profile_kyc_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only return KYC data if requesting user owns the profile or is admin
  IF auth.uid() = target_user_id OR public.has_role(auth.uid(), 'admin') THEN
    SELECT kyc_data INTO result
    FROM public.profiles
    WHERE user_id = target_user_id;
    RETURN result;
  ELSE
    -- Log unauthorized access attempt
    RAISE WARNING 'Unauthorized KYC data access attempt by % for user %', auth.uid(), target_user_id;
    RETURN NULL;
  END IF;
END;
$$;

-- Document the security model
COMMENT ON TABLE public.profiles IS 'User profiles. SECURITY: Direct SELECT restricted to own profile and admins only. Contract partners must use contract_partner_profiles view (excludes phone, kyc_data). Phone access requires mutual consent via get_safe_profile(). kyc_data only via get_profile_kyc_data().';
COMMENT ON VIEW public.contract_partner_profiles IS 'Safe view for contract partners. EXCLUDES: phone, kyc_data, settings. Only shows non-sensitive profile data for active contract relationships.';