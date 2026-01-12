-- Fix profiles_table_public_exposure: Remove redundant policy that could be exploited
-- The policy "Authenticated users can view basic profile info" is redundant because:
-- 1. "Users can view own profile" already allows viewing your own profile
-- 2. "Admins can view all profiles" already allows admins to view all profiles
-- 3. The relationship-based policies (contracts, appointments, conversations) properly scope access

DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Now profiles can only be accessed by:
-- 1. The profile owner (Users can view own profile)
-- 2. Admins (Admins can view all profiles, Admins can manage all profiles)
-- 3. Users with active/signed/completed contracts (Users can view contract party profiles)
-- 4. Users with confirmed/completed appointments (Users can view appointment party profiles)
-- 5. Users with conversations that have messages (Users can view conversation partner profiles)