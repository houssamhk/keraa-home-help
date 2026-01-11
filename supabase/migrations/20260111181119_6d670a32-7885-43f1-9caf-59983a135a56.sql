-- Drop the current relationship-based policies that can be exploited
DROP POLICY IF EXISTS "Users can view conversation partner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view contract party profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view appointment party profiles" ON public.profiles;

-- Policy 1: Users can view profiles of people in ACTIVE/SIGNED contracts only
-- This prevents exploitation via fake pending contracts
CREATE POLICY "Users can view contract party profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.status IN ('active', 'completed', 'signed')
      AND (
        (ct.landlord_id = auth.uid() AND (ct.tenant_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
        OR (ct.tenant_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.handyman_id = profiles.user_id))
        OR (ct.handyman_id = auth.uid() AND (ct.landlord_id = profiles.user_id OR ct.tenant_id = profiles.user_id))
      )
  )
);

-- Policy 2: Users can view profiles of people in CONFIRMED appointments only
-- This prevents exploitation via fake pending appointments
CREATE POLICY "Users can view appointment party profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.status IN ('confirmed', 'completed')
      AND (
        (a.owner_id = auth.uid() AND a.tenant_id = profiles.user_id)
        OR (a.tenant_id = auth.uid() AND a.owner_id = profiles.user_id)
      )
  )
);

-- Policy 3: Users can view profiles of people in conversations WITH MESSAGES
-- This prevents exploitation via empty conversations
CREATE POLICY "Users can view conversation partner profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.messages m ON m.conversation_id = c.id
    WHERE (
      (c.participant_1 = auth.uid() AND c.participant_2 = profiles.user_id)
      OR (c.participant_2 = auth.uid() AND c.participant_1 = profiles.user_id)
    )
  )
);

-- Create a public profiles view for safe fields only (avatar, rating, name for display)
-- This allows showing basic info in property cards without exposing phone/PII
CREATE OR REPLACE VIEW public.public_profiles AS
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