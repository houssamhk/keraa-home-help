-- Create reviews table for dual-sided reputation system
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewed_id UUID NOT NULL,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('owner', 'tenant')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  badges TEXT[], -- e.g., ['clean_tenant', 'reliable_owner', 'punctual_payment']
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one review per contract per reviewer
  UNIQUE(contract_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews for their contracts"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id AND
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id 
    AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    AND c.status = 'completed'
  )
);

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add reputation fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avg_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reputation_badges TEXT[] DEFAULT '{}';