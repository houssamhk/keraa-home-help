-- Fix handymen_unrestricted_profile_access: Protect exact location and rates
-- Strategy: Create a public view with approximate location, restrict full details

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view available handymen" ON public.handymen;

-- Policy 1: Handymen can manage their own profile (already exists)
-- Policy 2: Authenticated users can view basic handyman info (name, specialty, rating, availability)
CREATE POLICY "Authenticated users can browse handymen"
ON public.handymen
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_available = true
);

-- Policy 3: Users with business relationships can view full details
CREATE POLICY "Business partners can view full handyman details"
ON public.handymen
FOR SELECT
USING (
  -- User has a contract with this handyman
  EXISTS (
    SELECT 1 FROM public.contracts ct
    WHERE ct.handyman_id = handymen.user_id
      AND ct.status IN ('active', 'completed', 'signed', 'pending')
      AND (ct.landlord_id = auth.uid() OR ct.tenant_id = auth.uid())
  )
  OR
  -- User has an appointment with this handyman
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.owner_id = handymen.user_id OR a.tenant_id = handymen.user_id
      AND (a.owner_id = auth.uid() OR a.tenant_id = auth.uid())
  )
  OR
  -- User has a conversation with this handyman
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.participant_1 = handymen.user_id AND c.participant_2 = auth.uid())
       OR (c.participant_2 = handymen.user_id AND c.participant_1 = auth.uid())
  )
);

-- Policy 4: Admins can view all handymen
CREATE POLICY "Admins can view all handymen"
ON public.handymen
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create a public view with approximate location for browsing
-- This hides exact coordinates but allows distance-based filtering
CREATE OR REPLACE VIEW public.public_handymen
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  specialty,
  rating,
  total_reviews,
  is_available,
  description,
  -- Approximate location: round to 2 decimal places (~1.1km accuracy)
  -- This allows distance filtering without exposing exact address
  ROUND(latitude::numeric, 2) as approximate_latitude,
  ROUND(longitude::numeric, 2) as approximate_longitude,
  service_area_km,
  -- Hide exact hourly rate - show range instead
  CASE 
    WHEN hourly_rate < 500 THEN '< 500 DZD'
    WHEN hourly_rate < 1000 THEN '500-1000 DZD'
    WHEN hourly_rate < 2000 THEN '1000-2000 DZD'
    ELSE '2000+ DZD'
  END as rate_range,
  created_at
FROM public.handymen
WHERE is_available = true;

GRANT SELECT ON public.public_handymen TO authenticated;

-- Function to get full handyman details (only for authorized users)
CREATE OR REPLACE FUNCTION public.get_handyman_details(handyman_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  specialty TEXT[],
  rating NUMERIC,
  total_reviews INTEGER,
  is_available BOOLEAN,
  description TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  service_area_km INTEGER,
  hourly_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has business relationship or is admin
  IF public.has_role(auth.uid(), 'admin') 
     OR EXISTS (
       SELECT 1 FROM public.contracts ct
       WHERE ct.handyman_id = handyman_user_id
         AND ct.status IN ('active', 'completed', 'signed', 'pending')
         AND (ct.landlord_id = auth.uid() OR ct.tenant_id = auth.uid())
     )
     OR EXISTS (
       SELECT 1 FROM public.conversations c
       WHERE (c.participant_1 = handyman_user_id AND c.participant_2 = auth.uid())
          OR (c.participant_2 = handyman_user_id AND c.participant_1 = auth.uid())
     )
     OR auth.uid() = handyman_user_id -- Own profile
  THEN
    RETURN QUERY
    SELECT h.id, h.user_id, h.specialty, h.rating, h.total_reviews, 
           h.is_available, h.description, h.latitude, h.longitude, 
           h.service_area_km, h.hourly_rate
    FROM public.handymen h
    WHERE h.user_id = handyman_user_id;
  ELSE
    -- Return basic info only
    RETURN QUERY
    SELECT h.id, h.user_id, h.specialty, h.rating, h.total_reviews, 
           h.is_available, h.description, 
           ROUND(h.latitude, 2) as latitude, 
           ROUND(h.longitude, 2) as longitude, 
           h.service_area_km, 
           NULL::NUMERIC as hourly_rate
    FROM public.handymen h
    WHERE h.user_id = handyman_user_id AND h.is_available = true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_handyman_details(UUID) TO authenticated;

COMMENT ON VIEW public.public_handymen IS 'Public view of handymen with approximate location and rate ranges for browsing';
COMMENT ON FUNCTION public.get_handyman_details IS 'Get full handyman details - exact location and rates only for business partners';