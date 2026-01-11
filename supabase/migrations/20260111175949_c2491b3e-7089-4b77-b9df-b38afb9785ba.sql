-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can view profiles of people they have conversations with
CREATE POLICY "Users can view conversation partner profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.participant_1 = auth.uid() AND c.participant_2 = profiles.user_id)
       OR (c.participant_2 = auth.uid() AND c.participant_1 = profiles.user_id)
  )
);

-- Policy 3: Users can view profiles of people in their contracts
CREATE POLICY "Users can view contract party profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE (ct.landlord_id = auth.uid() AND (ct.tenant_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
       OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
       OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.tenant_id = profiles.user_id))
  )
);

-- Policy 4: Users can view profiles of people in their appointments
CREATE POLICY "Users can view appointment party profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE (a.owner_id = auth.uid() AND a.tenant_id = profiles.user_id)
       OR (a.tenant_id = auth.uid() AND a.owner_id = profiles.user_id)
  )
);

-- Policy 5: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));