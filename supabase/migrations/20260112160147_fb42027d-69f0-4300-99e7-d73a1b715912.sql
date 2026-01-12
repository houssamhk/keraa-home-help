-- Fix the overly permissive INSERT policy on kyc_access_audit
-- The "System can insert audit logs" policy should be more restrictive
DROP POLICY IF EXISTS "System can insert audit logs" ON public.kyc_access_audit;

-- Only authenticated users can insert (system functions run as authenticated)
-- And only if they're inserting their own admin_user_id
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.kyc_access_audit
FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);