-- Fix public_profiles_view_exposure: Ensure view is properly secured

-- Drop and recreate the view with proper security
DROP VIEW IF EXISTS public.public_profiles;

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
  -- Excluded: phone, kyc_data, settings
FROM public.profiles p;

-- Revoke all access from public and anon
REVOKE ALL ON public.public_profiles FROM public;
REVOKE ALL ON public.public_profiles FROM anon;

-- Grant access ONLY to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'Public profile view. SECURITY: security_invoker=true means RLS from profiles table applies. Only authenticated users can access. Excludes: phone, kyc_data, settings.';