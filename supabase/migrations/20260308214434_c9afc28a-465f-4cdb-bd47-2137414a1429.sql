
-- ============================================
-- FIX 1: Protect role_type from self-modification
-- The existing trigger protects kyc_verified, kyc_data, avg_rating, 
-- total_reviews, reputation_badges - but NOT role_type
-- ============================================
CREATE OR REPLACE FUNCTION public.check_profile_sensitive_fields_unchanged()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If the user is an admin, allow all changes
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive fields for non-admin users
  IF NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified THEN
    RAISE EXCEPTION 'Cannot modify kyc_verified field';
  END IF;
  IF NEW.kyc_data IS DISTINCT FROM OLD.kyc_data THEN
    RAISE EXCEPTION 'Cannot modify kyc_data field';
  END IF;
  IF NEW.avg_rating IS DISTINCT FROM OLD.avg_rating THEN
    RAISE EXCEPTION 'Cannot modify avg_rating field';
  END IF;
  IF NEW.total_reviews IS DISTINCT FROM OLD.total_reviews THEN
    RAISE EXCEPTION 'Cannot modify total_reviews field';
  END IF;
  IF NEW.reputation_badges IS DISTINCT FROM OLD.reputation_badges THEN
    RAISE EXCEPTION 'Cannot modify reputation_badges field';
  END IF;
  -- NEW: Protect role_type from self-modification
  IF NEW.role_type IS DISTINCT FROM OLD.role_type THEN
    RAISE EXCEPTION 'Cannot modify role_type field';
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger is attached
DROP TRIGGER IF EXISTS check_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER check_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_sensitive_fields_unchanged();

-- ============================================
-- FIX 2: Lock down KYC audit log - remove user INSERT, restrict to admin only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.kyc_access_audit;

-- Only admins can insert audit logs (via RPC functions that already do this)
CREATE POLICY "Only admins can insert audit logs"
  ON public.kyc_access_audit
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX 3: Verify handymen broad policy is gone (already dropped last migration)
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can browse handymen" ON public.handymen;
