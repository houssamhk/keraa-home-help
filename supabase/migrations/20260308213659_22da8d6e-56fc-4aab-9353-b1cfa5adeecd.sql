
-- Fix 1: Remove broad handymen SELECT policy that exposes exact GPS
DROP POLICY IF EXISTS "Authenticated users can browse handymen" ON public.handymen;

-- Fix 2: Recreate all views with security_invoker = true

-- public_profiles
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  role_type,
  kyc_verified,
  avg_rating,
  total_reviews,
  reputation_badges
FROM public.profiles;

-- public_handymen
DROP VIEW IF EXISTS public.public_handymen;
CREATE VIEW public.public_handymen WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  specialty,
  rating,
  total_reviews,
  is_available,
  description,
  ROUND(latitude, 2) as approximate_latitude,
  ROUND(longitude, 2) as approximate_longitude,
  service_area_km,
  CASE 
    WHEN hourly_rate IS NOT NULL THEN 
      CONCAT(FLOOR(hourly_rate * 0.8)::text, '-', CEIL(hourly_rate * 1.2)::text)
    ELSE NULL
  END as rate_range,
  created_at
FROM public.handymen
WHERE is_available = true;

-- appointment_partner_profiles
DROP VIEW IF EXISTS public.appointment_partner_profiles;
CREATE VIEW public.appointment_partner_profiles WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  role_type,
  kyc_verified,
  avg_rating,
  total_reviews,
  reputation_badges
FROM public.profiles;

-- contract_partner_profiles
DROP VIEW IF EXISTS public.contract_partner_profiles;
CREATE VIEW public.contract_partner_profiles WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  role_type,
  kyc_verified,
  avg_rating,
  total_reviews,
  reputation_badges
FROM public.profiles;

-- conversation_partner_profiles
DROP VIEW IF EXISTS public.conversation_partner_profiles;
CREATE VIEW public.conversation_partner_profiles WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  role_type,
  kyc_verified,
  avg_rating,
  total_reviews,
  reputation_badges
FROM public.profiles;

-- historical_contract_partners
DROP VIEW IF EXISTS public.historical_contract_partners;
CREATE VIEW public.historical_contract_partners WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  role_type,
  kyc_verified,
  avg_rating,
  total_reviews
FROM public.profiles;

-- Grant access to authenticated users only (not anon)
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;

REVOKE ALL ON public.public_handymen FROM anon;
GRANT SELECT ON public.public_handymen TO authenticated;

REVOKE ALL ON public.appointment_partner_profiles FROM anon;
GRANT SELECT ON public.appointment_partner_profiles TO authenticated;

REVOKE ALL ON public.contract_partner_profiles FROM anon;
GRANT SELECT ON public.contract_partner_profiles TO authenticated;

REVOKE ALL ON public.conversation_partner_profiles FROM anon;
GRANT SELECT ON public.conversation_partner_profiles TO authenticated;

REVOKE ALL ON public.historical_contract_partners FROM anon;
GRANT SELECT ON public.historical_contract_partners TO authenticated;
