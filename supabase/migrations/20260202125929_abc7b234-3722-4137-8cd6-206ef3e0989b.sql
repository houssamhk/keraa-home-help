-- =====================================================
-- 1. جدول طلبات الخدمة (Service Requests)
-- =====================================================
CREATE TABLE public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handyman_id UUID NOT NULL,
    client_id UUID NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    preferred_date DATE NOT NULL,
    preferred_time TIME,
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    status TEXT NOT NULL DEFAULT 'pending',
    estimated_price NUMERIC,
    final_price NUMERIC,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
    handyman_rating INTEGER CHECK (handyman_rating >= 1 AND handyman_rating <= 5),
    client_review TEXT,
    handyman_review TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_requests
CREATE POLICY "Clients can create service requests"
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view their own requests"
ON public.service_requests FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Handymen can view requests for them"
ON public.service_requests FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.handymen h 
    WHERE h.user_id = auth.uid() AND h.id = service_requests.handyman_id
));

CREATE POLICY "Clients can update their pending requests"
ON public.service_requests FOR UPDATE
USING (auth.uid() = client_id AND status IN ('pending', 'accepted'));

CREATE POLICY "Handymen can update request status"
ON public.service_requests FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.handymen h 
    WHERE h.user_id = auth.uid() AND h.id = service_requests.handyman_id
));

CREATE POLICY "Admins can manage all requests"
ON public.service_requests FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. جدول اشتراكات الإشعارات (Push Subscriptions)
-- =====================================================
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all subscriptions"
ON public.push_subscriptions FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. جدول المحافظ (Wallets)
-- =====================================================
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
    pending_balance NUMERIC NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
    currency TEXT NOT NULL DEFAULT 'DZD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallets"
ON public.wallets FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. جدول معاملات المحفظة (Wallet Transactions)
-- =====================================================
CREATE TABLE public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'payment', 'refund', 'transfer_in', 'transfer_out')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.wallets w 
    WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid()
));

CREATE POLICY "Users can create transactions for their wallet"
ON public.wallet_transactions FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.wallets w 
    WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all transactions"
ON public.wallet_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. Functions for wallet operations
-- =====================================================

-- Function to create wallet for new users (can be called on signup)
CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    wallet_id UUID;
BEGIN
    -- Check if wallet exists
    SELECT id INTO wallet_id FROM public.wallets WHERE user_id = auth.uid();
    
    -- Create if not exists
    IF wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id)
        VALUES (auth.uid())
        RETURNING id INTO wallet_id;
    END IF;
    
    RETURN wallet_id;
END;
$$;

-- Function to process escrow hold (when arrabon is submitted)
CREATE OR REPLACE FUNCTION public.hold_escrow(
    p_wallet_id UUID,
    p_amount NUMERIC,
    p_reference_id UUID,
    p_description TEXT DEFAULT 'حجز عربون'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance NUMERIC;
    v_user_id UUID;
BEGIN
    -- Get wallet owner and balance
    SELECT user_id, balance INTO v_user_id, current_balance
    FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;
    
    -- Verify ownership
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Not wallet owner';
    END IF;
    
    -- Check sufficient balance
    IF current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Deduct from balance, add to pending
    UPDATE public.wallets
    SET balance = balance - p_amount,
        pending_balance = pending_balance + p_amount,
        updated_at = now()
    WHERE id = p_wallet_id;
    
    -- Create transaction record
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference_id, reference_type, status)
    VALUES (p_wallet_id, 'escrow_hold', p_amount, p_description, p_reference_id, 'arrabon', 'completed');
    
    RETURN TRUE;
END;
$$;

-- Function to release escrow (when arrabon is verified/released)
CREATE OR REPLACE FUNCTION public.release_escrow(
    p_wallet_id UUID,
    p_amount NUMERIC,
    p_reference_id UUID,
    p_to_user_id UUID,
    p_description TEXT DEFAULT 'تحرير عربون'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_pending NUMERIC;
    target_wallet_id UUID;
BEGIN
    -- Verify admin or owner
    IF NOT has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Get pending balance
    SELECT pending_balance INTO current_pending
    FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;
    
    IF current_pending < p_amount THEN
        RAISE EXCEPTION 'Insufficient pending balance';
    END IF;
    
    -- Deduct from pending
    UPDATE public.wallets
    SET pending_balance = pending_balance - p_amount,
        updated_at = now()
    WHERE id = p_wallet_id;
    
    -- Create release transaction
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference_id, reference_type, status)
    VALUES (p_wallet_id, 'escrow_release', p_amount, p_description, p_reference_id, 'arrabon', 'completed');
    
    -- Get or create target wallet
    SELECT id INTO target_wallet_id FROM public.wallets WHERE user_id = p_to_user_id;
    IF target_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id) VALUES (p_to_user_id) RETURNING id INTO target_wallet_id;
    END IF;
    
    -- Add to target wallet
    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE id = target_wallet_id;
    
    -- Create incoming transaction for target
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference_id, reference_type, status)
    VALUES (target_wallet_id, 'transfer_in', p_amount, 'استلام عربون', p_reference_id, 'arrabon', 'completed');
    
    RETURN TRUE;
END;
$$;