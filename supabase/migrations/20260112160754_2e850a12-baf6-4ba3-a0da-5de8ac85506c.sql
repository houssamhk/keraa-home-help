-- Fix public_profiles_view_unrestricted: Recreate view with proper security
-- Drop and recreate with security_invoker = true
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
  -- Excluded: phone, kyc_data, settings (sensitive fields)
FROM public.profiles p;

-- Revoke all default access
REVOKE ALL ON public.public_profiles FROM public;
REVOKE ALL ON public.public_profiles FROM anon;

-- Grant access ONLY to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Document the view's purpose and security
COMMENT ON VIEW public.public_profiles IS 'Public profile information view. SECURITY: Uses security_invoker=true so RLS from profiles table applies. Only authenticated users can access. Excludes: phone, kyc_data, settings.';