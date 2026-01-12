-- Fix: Protect phone numbers - only expose to users with verified contracts
-- Create a secure function to get profile data with conditional phone exposure

-- Function to check if user has a verified contract with another user
CREATE OR REPLACE FUNCTION public.has_verified_contract_with(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.status IN ('active', 'completed', 'signed')
      AND (
        (ct.landlord_id = auth.uid() AND (ct.tenant_id = target_user_id OR ct.handyman_id = target_user_id))
        OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = target_user_id OR ct.handyman_id = target_user_id))
        OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = target_user_id OR ct.tenant_id = target_user_id))
      )
  )
$$;

-- Function to get profile with conditional phone number exposure
CREATE OR REPLACE FUNCTION public.get_safe_profile(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  avg_rating NUMERIC,
  total_reviews INTEGER,
  reputation_badges TEXT[],
  role_type TEXT,
  kyc_verified BOOLEAN,
  phone TEXT -- Will be NULL unless user has verified contract
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.avg_rating,
    p.total_reviews,
    p.reputation_badges,
    p.role_type,
    p.kyc_verified,
    -- Only expose phone if:
    -- 1. User is viewing their own profile
    -- 2. User is an admin
    -- 3. User has a verified contract with the target
    CASE 
      WHEN auth.uid() = target_user_id THEN p.phone
      WHEN public.has_role(auth.uid(), 'admin') THEN p.phone
      WHEN public.has_verified_contract_with(target_user_id) THEN p.phone
      ELSE NULL
    END as phone
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_verified_contract_with(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_profile(UUID) TO authenticated;

-- Update the public_profiles view to exclude phone entirely
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  avg_rating,
  total_reviews,
  reputation_badges,
  role_type,
  kyc_verified
  -- Phone is intentionally excluded - use get_safe_profile() function instead
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Add comment documenting the security design
COMMENT ON FUNCTION public.get_safe_profile IS 'Securely retrieves profile data. Phone numbers are only exposed to: (1) profile owner, (2) admins, (3) users with verified contracts';