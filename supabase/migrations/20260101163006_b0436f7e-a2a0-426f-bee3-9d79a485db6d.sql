-- Create appointments table for booking
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Tenants can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can view their appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

CREATE POLICY "Users can update their appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

CREATE POLICY "Users can delete their appointments" 
ON public.appointments 
FOR DELETE 
USING (auth.uid() = tenant_id);

-- Admins can manage all appointments
CREATE POLICY "Admins can manage all appointments" 
ON public.appointments 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for other tables
CREATE POLICY "Admins can manage all properties" 
ON public.properties 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all contracts" 
ON public.contracts 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();