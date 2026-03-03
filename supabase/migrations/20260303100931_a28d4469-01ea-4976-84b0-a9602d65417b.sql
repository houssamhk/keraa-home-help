
-- Step 1: Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Step 2: Create a security definer function to get current sensitive field values
CREATE OR REPLACE FUNCTION public.check_profile_sensitive_fields_unchanged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

-- Step 3: Create trigger to enforce sensitive field protection
DROP TRIGGER IF EXISTS enforce_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER enforce_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_sensitive_fields_unchanged();

-- Step 4: Recreate the update policy (same scope but now protected by trigger)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);
