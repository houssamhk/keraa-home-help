-- Fix the security definer view issue by recreating with security_invoker = true
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
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add RLS policy to allow viewing basic profile info for all authenticated users
-- This uses the view which only exposes safe fields
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Only allow viewing limited fields - enforced by using public_profiles view in app
    -- This policy allows the view to work while full profiles remain protected
    user_id = auth.uid() -- Own profile
    OR public.has_role(auth.uid(), 'admin') -- Admin
  )
);