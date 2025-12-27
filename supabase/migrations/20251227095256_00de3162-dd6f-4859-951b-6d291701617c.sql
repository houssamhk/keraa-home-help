-- Create bills table for tracking utility bills and expenses
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_id UUID REFERENCES public.contracts(id),
  property_id UUID REFERENCES public.properties(id),
  bill_type TEXT NOT NULL, -- 'electricity', 'gas', 'water', 'internet', 'rent', 'maintenance', 'other'
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  payment_method TEXT, -- 'cash', 'ccp', 'baridimob', 'bank_transfer'
  payment_reference TEXT,
  notes TEXT,
  recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER, -- Day of month for recurring bills
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bill_reminders table for notification settings
CREATE TABLE public.bill_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  remind_days_before INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  last_reminded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bills
CREATE POLICY "Users can manage own bills"
  ON public.bills
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for bill_reminders
CREATE POLICY "Users can manage own reminders"
  ON public.bill_reminders
  FOR ALL
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();