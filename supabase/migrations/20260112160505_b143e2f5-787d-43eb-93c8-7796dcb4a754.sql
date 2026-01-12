-- Fix profiles_phone_exposure: Remove policies that expose phone through conversations/appointments
-- Phone should ONLY be visible to users with verified contracts

-- Drop policies that expose full profile (including phone) through non-contract relationships
DROP POLICY IF EXISTS "Users can view conversation partner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view appointment party profiles" ON public.profiles;

-- Keep only these SELECT policies:
-- 1. Users can view own profile (safe - own data)
-- 2. Admins can view all profiles (safe - admin access)
-- 3. Users can view contract party profiles (safe - business relationship)

-- Create a secure view for conversation/appointment partners (no phone!)
CREATE OR REPLACE VIEW public.conversation_partner_profiles
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
  -- NO phone field - use get_safe_profile() for phone access
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.conversations c
  JOIN public.messages m ON m.conversation_id = c.id
  WHERE (
    (c.participant_1 = auth.uid() AND c.participant_2 = p.user_id)
    OR (c.participant_2 = auth.uid() AND c.participant_1 = p.user_id)
  )
);

-- Create a secure view for appointment partners (no phone!)
CREATE OR REPLACE VIEW public.appointment_partner_profiles
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
  -- NO phone field - use get_safe_profile() for phone access
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.status IN ('confirmed', 'completed')
    AND (
      (a.owner_id = auth.uid() AND a.tenant_id = p.user_id)
      OR (a.tenant_id = auth.uid() AND a.owner_id = p.user_id)
    )
);

GRANT SELECT ON public.conversation_partner_profiles TO authenticated;
GRANT SELECT ON public.appointment_partner_profiles TO authenticated;

-- Update get_safe_profile to be the ONLY way to access phone numbers
-- Already created earlier - it only returns phone for:
-- 1. Own profile
-- 2. Admin
-- 3. Users with verified contracts

COMMENT ON VIEW public.conversation_partner_profiles IS 'Safe profile view for conversation partners - excludes phone number';
COMMENT ON VIEW public.appointment_partner_profiles IS 'Safe profile view for appointment partners - excludes phone number';