-- Fix profiles_table_sensitive_exposure: Restrict phone access to active contracts only

-- First drop the existing function to allow signature change
DROP FUNCTION IF EXISTS public.get_safe_profile(UUID);

-- Recreate get_safe_profile function to only return phone for ACTIVE contracts
CREATE FUNCTION public.get_safe_profile(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role_type TEXT,
  kyc_verified BOOLEAN,
  avg_rating NUMERIC,
  total_reviews INTEGER,
  reputation_badges TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  requesting_user_id UUID;
  has_active_contract BOOLEAN;
BEGIN
  requesting_user_id := auth.uid();
  
  -- Check if there's an ACTIVE contract only (not completed/signed)
  SELECT EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.status = 'active'
    AND (
      (ct.landlord_id = requesting_user_id AND (ct.tenant_id = target_user_id OR ct.handyman_id = target_user_id))
      OR (ct.tenant_id = requesting_user_id AND (ct.landlord_id = target_user_id OR ct.handyman_id = target_user_id))
      OR (ct.handyman_id = requesting_user_id AND (ct.landlord_id = target_user_id OR ct.tenant_id = target_user_id))
    )
  ) INTO has_active_contract;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    -- Phone: only visible to self, admins, or ACTIVE contract parties
    CASE 
      WHEN requesting_user_id = target_user_id THEN p.phone
      WHEN public.has_role(requesting_user_id, 'admin') THEN p.phone
      WHEN has_active_contract THEN p.phone
      ELSE NULL  -- Hide phone for completed/signed contracts
    END as phone,
    p.role_type,
    p.kyc_verified,
    p.avg_rating,
    p.total_reviews,
    p.reputation_badges
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

-- Update the permissive policy for contract parties - restrict to active only
DROP POLICY IF EXISTS "Users can view contract party profiles" ON public.profiles;

CREATE POLICY "Users can view active contract party profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.status = 'active'
    AND (
      (ct.landlord_id = auth.uid() AND (ct.tenant_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
      OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
      OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.tenant_id = profiles.user_id))
    )
  )
);

-- Create a view for historical contract partners (basic info only, NO phone)
DROP VIEW IF EXISTS public.historical_contract_partners;

CREATE VIEW public.historical_contract_partners
WITH (security_invoker = true)
AS
SELECT DISTINCT
  p.user_id,
  p.full_name,
  p.avatar_url,
  p.avg_rating,
  p.total_reviews,
  p.role_type,
  p.kyc_verified
  -- NO phone, NO sensitive data
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.contracts ct
  WHERE ct.status IN ('completed', 'signed')
  AND (
    (ct.landlord_id = auth.uid() AND (ct.tenant_id = p.user_id OR ct.handyman_id = p.user_id))
    OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = p.user_id OR ct.handyman_id = p.user_id))
    OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = p.user_id OR ct.tenant_id = p.user_id))
  )
);

REVOKE ALL ON public.historical_contract_partners FROM anon;
GRANT SELECT ON public.historical_contract_partners TO authenticated;

COMMENT ON FUNCTION public.get_safe_profile IS 'Secure profile access. Phone only returned for: own profile, admins, or ACTIVE contract parties. Completed contracts do NOT grant phone access.';
COMMENT ON VIEW public.historical_contract_partners IS 'Historical contract partners view. Excludes phone numbers. Only basic profile info for completed/signed contracts.';