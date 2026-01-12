-- Add audit logging for KYC document access
-- This creates a paper trail for security investigations

-- Create audit table for KYC access
CREATE TABLE IF NOT EXISTS public.kyc_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'view', 'verify', 'reject'
  ip_address TEXT,
  user_agent TEXT,
  details JSONB
);

-- Enable RLS on audit table
ALTER TABLE public.kyc_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view KYC audit logs"
ON public.kyc_access_audit
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs (via function)
CREATE POLICY "System can insert audit logs"
ON public.kyc_access_audit
FOR INSERT
WITH CHECK (true);

-- Create secure function for admin KYC access with logging
CREATE OR REPLACE FUNCTION public.admin_get_kyc_verification(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  id_type TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Log the access
  INSERT INTO public.kyc_access_audit (admin_user_id, target_user_id, action, details)
  VALUES (
    auth.uid(),
    target_user_id,
    'view',
    jsonb_build_object('accessed_via', 'admin_get_kyc_verification')
  );
  
  -- Return KYC data
  RETURN QUERY
  SELECT 
    k.id, k.user_id, k.id_type, k.id_front_url, k.id_back_url,
    k.selfie_url, k.status, k.submitted_at, k.verified_at, k.rejection_reason
  FROM public.kyc_verifications k
  WHERE k.user_id = target_user_id;
END;
$$;

-- Create secure function for admin KYC verification with logging
CREATE OR REPLACE FUNCTION public.admin_verify_kyc(
  target_user_id UUID,
  new_status TEXT,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Validate status
  IF new_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: must be verified or rejected';
  END IF;
  
  -- Log the action
  INSERT INTO public.kyc_access_audit (admin_user_id, target_user_id, action, details)
  VALUES (
    auth.uid(),
    target_user_id,
    CASE WHEN new_status = 'verified' THEN 'verify' ELSE 'reject' END,
    jsonb_build_object(
      'new_status', new_status,
      'reason', reason
    )
  );
  
  -- Update KYC verification
  UPDATE public.kyc_verifications
  SET 
    status = new_status,
    verified_by = auth.uid(),
    verified_at = CASE WHEN new_status = 'verified' THEN NOW() ELSE NULL END,
    rejection_reason = CASE WHEN new_status = 'rejected' THEN reason ELSE NULL END,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Update profile kyc_verified status
  UPDATE public.profiles
  SET 
    kyc_verified = (new_status = 'verified'),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_get_kyc_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_kyc(UUID, TEXT, TEXT) TO authenticated;

-- Add index for audit table queries
CREATE INDEX idx_kyc_access_audit_admin ON public.kyc_access_audit(admin_user_id);
CREATE INDEX idx_kyc_access_audit_target ON public.kyc_access_audit(target_user_id);
CREATE INDEX idx_kyc_access_audit_time ON public.kyc_access_audit(accessed_at DESC);

COMMENT ON TABLE public.kyc_access_audit IS 'Audit log for admin access to KYC documents - tracks all views and verifications';
COMMENT ON FUNCTION public.admin_get_kyc_verification IS 'Secure admin access to KYC data with mandatory audit logging';
COMMENT ON FUNCTION public.admin_verify_kyc IS 'Secure admin KYC verification with mandatory audit logging';