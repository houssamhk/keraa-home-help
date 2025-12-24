-- Create storage bucket for property media
INSERT INTO storage.buckets (id, name, public) VALUES ('property-media', 'property-media', true);

-- Create storage policies for property media
CREATE POLICY "Anyone can view property media" ON storage.objects FOR SELECT USING (bucket_id = 'property-media');

CREATE POLICY "Authenticated users can upload property media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own media" ON storage.objects FOR UPDATE USING (bucket_id = 'property-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media" ON storage.objects FOR DELETE USING (bucket_id = 'property-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create contracts table for agreements between users
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  landlord_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  handyman_id UUID,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('rental', 'service')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_amount NUMERIC,
  total_amount NUMERIC,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'disputed')),
  landlord_signed BOOLEAN DEFAULT false,
  tenant_signed BOOLEAN DEFAULT false,
  landlord_signed_at TIMESTAMP WITH TIME ZONE,
  tenant_signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Contracts policies
CREATE POLICY "Users can view their own contracts" ON public.contracts 
  FOR SELECT USING (auth.uid() = landlord_id OR auth.uid() = tenant_id OR auth.uid() = handyman_id);

CREATE POLICY "Users can create contracts" ON public.contracts 
  FOR INSERT WITH CHECK (auth.uid() = landlord_id OR auth.uid() = tenant_id);

CREATE POLICY "Parties can update their contracts" ON public.contracts 
  FOR UPDATE USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);

-- Add trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for contracts
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;