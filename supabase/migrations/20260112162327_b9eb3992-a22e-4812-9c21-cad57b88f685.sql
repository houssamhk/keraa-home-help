-- Fix profiles_table_public_exposure: Add explicit consent for phone sharing

-- Add consent fields to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS landlord_phone_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tenant_phone_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS landlord_consented_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tenant_consented_at TIMESTAMPTZ;

-- Update get_safe_profile to require MUTUAL consent for phone sharing
DROP FUNCTION IF EXISTS public.get_safe_profile(UUID);

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
  has_mutual_consent BOOLEAN;
BEGIN
  requesting_user_id := auth.uid();
  
  -- Check if there's an ACTIVE contract with MUTUAL phone consent
  SELECT EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.status = 'active'
    AND ct.landlord_phone_consent = true  -- Landlord agreed to share
    AND ct.tenant_phone_consent = true    -- Tenant agreed to share
    AND (
      (ct.landlord_id = requesting_user_id AND (ct.tenant_id = target_user_id OR ct.handyman_id = target_user_id))
      OR (ct.tenant_id = requesting_user_id AND (ct.landlord_id = target_user_id OR ct.handyman_id = target_user_id))
      OR (ct.handyman_id = requesting_user_id AND (ct.landlord_id = target_user_id OR ct.tenant_id = target_user_id))
    )
  ) INTO has_mutual_consent;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    -- Phone: only visible to self, admins, or with MUTUAL consent
    CASE 
      WHEN requesting_user_id = target_user_id THEN p.phone
      WHEN public.has_role(requesting_user_id, 'admin') THEN p.phone
      WHEN has_mutual_consent THEN p.phone
      ELSE NULL  -- Hidden without mutual consent
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

-- Create function to give phone consent
CREATE OR REPLACE FUNCTION public.give_phone_consent(contract_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine if user is landlord or tenant
  SELECT 
    CASE 
      WHEN landlord_id = auth.uid() THEN 'landlord'
      WHEN tenant_id = auth.uid() THEN 'tenant'
      ELSE NULL
    END INTO user_role
  FROM public.contracts
  WHERE id = contract_id AND status = 'active';
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not a party to this contract';
  END IF;
  
  -- Update consent based on role
  IF user_role = 'landlord' THEN
    UPDATE public.contracts
    SET landlord_phone_consent = true, landlord_consented_at = NOW()
    WHERE id = contract_id;
  ELSE
    UPDATE public.contracts
    SET tenant_phone_consent = true, tenant_consented_at = NOW()
    WHERE id = contract_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create function to revoke phone consent
CREATE OR REPLACE FUNCTION public.revoke_phone_consent(contract_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN landlord_id = auth.uid() THEN 'landlord'
      WHEN tenant_id = auth.uid() THEN 'tenant'
      ELSE NULL
    END INTO user_role
  FROM public.contracts
  WHERE id = contract_id;
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not a party to this contract';
  END IF;
  
  IF user_role = 'landlord' THEN
    UPDATE public.contracts
    SET landlord_phone_consent = false, landlord_consented_at = NULL
    WHERE id = contract_id;
  ELSE
    UPDATE public.contracts
    SET tenant_phone_consent = false, tenant_consented_at = NULL
    WHERE id = contract_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.get_safe_profile IS 'Secure profile access. Phone ONLY returned for: own profile, admins, or active contracts with MUTUAL consent from both parties.';
COMMENT ON FUNCTION public.give_phone_consent IS 'Grant consent to share your phone number with contract partner.';
COMMENT ON FUNCTION public.revoke_phone_consent IS 'Revoke consent to share your phone number.';