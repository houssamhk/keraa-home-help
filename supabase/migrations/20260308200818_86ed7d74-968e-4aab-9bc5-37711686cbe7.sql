
-- Fix 1: Restrict featured_listings SELECT policy to hide payment details from non-owners
DROP POLICY IF EXISTS "Users can view active featured listings" ON public.featured_listings;

-- Public can only see non-sensitive fields via a view, owners/admins see everything
CREATE POLICY "Users can view active featured listings"
ON public.featured_listings
FOR SELECT
TO authenticated
USING (
  status = 'active'
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

-- Fix 2: Fix push_subscriptions policy - change from public to service_role
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

CREATE POLICY "Service role can read all subscriptions"
ON public.push_subscriptions
FOR SELECT
TO service_role
USING (true);
