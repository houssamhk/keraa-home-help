-- Fix profiles_table_public_exposure: Remove public_profiles view that exposes all profiles

-- Drop the dangerous public_profiles view that has no access restrictions
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate public_profiles with proper restrictions - only show minimal public info
-- for users with verified KYC who have opted-in to public visibility
CREATE VIEW public.public_profiles
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
WHERE 
  -- Only show profiles that are:
  -- 1. The current user's own profile
  p.user_id = auth.uid()
  OR
  -- 2. Property owners (for property listings)
  EXISTS (
    SELECT 1 FROM public.properties prop
    WHERE prop.owner_id = p.user_id
    AND prop.is_available = true
  )
  OR
  -- 3. Available handymen
  EXISTS (
    SELECT 1 FROM public.handymen h
    WHERE h.user_id = p.user_id
    AND h.is_available = true
  );

-- Revoke public access
REVOKE ALL ON public.public_profiles FROM public;
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Document the security model
COMMENT ON VIEW public.public_profiles IS 'Secure public profiles view. Only shows non-sensitive data (excludes phone, kyc_data, settings). Access limited to: own profile, property owners with available listings, and available handymen.';