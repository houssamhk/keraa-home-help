-- Fix SECURITY DEFINER view issue: Change to SECURITY INVOKER
CREATE OR REPLACE VIEW public.safe_featured_listings 
WITH (security_invoker = true) AS
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
  CASE WHEN user_id = auth.uid() THEN payment_proof_url ELSE NULL END AS payment_proof_url,
  CASE WHEN user_id = auth.uid() THEN payment_reference ELSE NULL END AS payment_reference,
  CASE WHEN user_id = auth.uid() THEN price_paid ELSE NULL END AS price_paid,
  CASE WHEN user_id = auth.uid() THEN payment_method ELSE NULL END AS payment_method,
  verified_at,
  verified_by
FROM public.featured_listings;