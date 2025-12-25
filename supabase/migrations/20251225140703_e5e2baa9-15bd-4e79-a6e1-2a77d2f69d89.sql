-- Create arrabon/deposits table for Escrow Lite system
CREATE TABLE public.arrabons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'baridimob', -- baridimob, ccp, cash
  payment_proof_url TEXT, -- Screenshot URL
  payment_reference TEXT, -- Transaction reference number
  status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, verified, rejected, released
  submitted_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  released_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arrabons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can view their own arrabons"
ON public.arrabons
FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Owners can view arrabons for their contracts"
ON public.arrabons
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Tenants can create arrabons"
ON public.arrabons
FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update their pending arrabons"
ON public.arrabons
FOR UPDATE
USING (auth.uid() = tenant_id AND status IN ('pending', 'rejected'));

CREATE POLICY "Owners can verify arrabons"
ON public.arrabons
FOR UPDATE
USING (auth.uid() = owner_id AND status = 'submitted');

-- Trigger for updated_at
CREATE TRIGGER update_arrabons_updated_at
BEFORE UPDATE ON public.arrabons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.arrabons;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Storage policies for payment proofs
CREATE POLICY "Users can upload their payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Contract parties can view payment proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs' 
  AND EXISTS (
    SELECT 1 FROM public.arrabons a
    WHERE a.payment_proof_url LIKE '%' || name || '%'
    AND (auth.uid() = a.tenant_id OR auth.uid() = a.owner_id)
  )
);