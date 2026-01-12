-- Fix 1: Remove sensitive kyc_data from public_profiles view
-- Only expose safe boolean kyc_verified, not the raw data
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
  kyc_verified -- Only boolean, not the sensitive kyc_data JSONB
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Fix 2: Clean up duplicate storage policies for kyc-documents
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;

-- Keep only the properly named policies:
-- "Users can view own KYC documents" (already exists)
-- "Users can upload own KYC documents" (already exists)
-- "Users can update own KYC documents" (already exists)
-- "Users can delete own KYC documents" (already exists)
-- "Admins can manage KYC documents" (already exists)
-- "Admins can view all KYC documents" (already exists)

-- Fix 3: Create a function to safely access profile data
-- This ensures kyc_data is only returned to the profile owner or admins
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
    RETURN NULL;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_kyc_data(UUID) TO authenticated;