-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;

-- Policy 1: Authenticated users can view available properties (basic browsing)
-- This still allows property browsing but requires authentication
CREATE POLICY "Authenticated users can view available properties"
ON public.properties
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_available = true
);

-- Policy 2: Users can view properties they're in a contract with
CREATE POLICY "Users can view contract properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.property_id = properties.id
      AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
  )
);

-- Policy 3: Users can view properties from conversations they're in
CREATE POLICY "Users can view conversation properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations conv
    WHERE conv.property_id = properties.id
      AND (conv.participant_1 = auth.uid() OR conv.participant_2 = auth.uid())
  )
);

-- Policy 4: Users can view properties they have appointments for
CREATE POLICY "Users can view appointment properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.property_id = properties.id
      AND (a.owner_id = auth.uid() OR a.tenant_id = auth.uid())
  )
);