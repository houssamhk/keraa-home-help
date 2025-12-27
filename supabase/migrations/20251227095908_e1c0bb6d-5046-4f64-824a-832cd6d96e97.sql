-- Create kyc_verifications table for tracking verification status
CREATE TABLE public.kyc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'approved', 'rejected'
  id_type TEXT, -- 'national_id', 'passport', 'driver_license'
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  rejection_reason TEXT,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own KYC"
  ON public.kyc_verifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own KYC"
  ON public.kyc_verifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending KYC"
  ON public.kyc_verifications
  FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'rejected'));

-- Admins can manage all KYC
CREATE POLICY "Admins can manage all KYC"
  ON public.kyc_verifications
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for KYC documents
CREATE POLICY "Users can upload their own KYC documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own KYC documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'kyc-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at
CREATE TRIGGER update_kyc_verifications_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();