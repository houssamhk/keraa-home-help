
-- Fix: Allow initial role_type setting (when current value is NULL/default)
-- but block changing it once set
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
  -- Protect role_type: allow initial setting (from default 'tenant' or NULL)
  -- but block changing once explicitly set by user
  IF NEW.role_type IS DISTINCT FROM OLD.role_type THEN
    -- Allow setting role only if current is the default 'tenant' (initial setup)
    IF OLD.role_type IS NOT NULL AND OLD.role_type != 'tenant' THEN
      RAISE EXCEPTION 'Cannot modify role_type field once set';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
