-- Fix security: Restrict featured_listings SELECT policy for payment-sensitive data

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Featured listings are viewable by everyone if active or by owner" ON public.featured_listings;
DROP POLICY IF EXISTS "Featured listings basic info viewable by authenticated users" ON public.featured_listings;
DROP POLICY IF EXISTS "Featured listings owners and admins see full details" ON public.featured_listings;

-- Create a secure view that hides sensitive payment columns for non-owners
CREATE OR REPLACE VIEW public.safe_featured_listings AS
SELECT 
  id,
  property_id,
  user_id,
  feature_type,
  status,
  starts_at,
  expires_at,
  duration_days,
  created_at,
  updated_at,
  -- Only show payment data to the owner
  CASE WHEN user_id = auth.uid() THEN payment_proof_url ELSE NULL END AS payment_proof_url,
  CASE WHEN user_id = auth.uid() THEN payment_reference ELSE NULL END AS payment_reference,
  CASE WHEN user_id = auth.uid() THEN price_paid ELSE NULL END AS price_paid,
  CASE WHEN user_id = auth.uid() THEN payment_method ELSE NULL END AS payment_method,
  verified_at,
  verified_by
FROM public.featured_listings;

-- Re-create a single SELECT policy: active listings visible to all, own listings always visible
CREATE POLICY "featured_listings_select_policy"
ON public.featured_listings
FOR SELECT
TO authenticated
USING (
  status = 'active' OR 
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);