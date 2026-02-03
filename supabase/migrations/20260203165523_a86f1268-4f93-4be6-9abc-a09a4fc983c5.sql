-- =====================================================
-- النموذج الاقتصادي الهجين - Freemium Business Model
-- =====================================================

-- 1. جدول الإعلانات المميزة (Featured Listings)
-- =====================================================
CREATE TABLE public.featured_listings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- نوع التميز
    feature_type TEXT NOT NULL DEFAULT 'top_results' CHECK (feature_type IN ('top_results', 'highlighted', 'premium_badge')),
    
    -- المدة والأسعار (بالدينار الجزائري)
    duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14, 30)),
    price_paid NUMERIC NOT NULL,
    
    -- الحالة والتواريخ
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- معلومات الدفع
    payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'ccp', 'baridimob')),
    payment_proof_url TEXT,
    payment_reference TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(property_id, status) -- عقار واحد لا يمكن أن يكون مميزاً مرتين في نفس الوقت
);

-- 2. جدول تسعيرة الإعلانات المميزة
-- =====================================================
CREATE TABLE public.featured_pricing (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    duration_days INTEGER NOT NULL UNIQUE CHECK (duration_days IN (7, 14, 30)),
    price NUMERIC NOT NULL,
    discount_percentage NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج الأسعار الافتراضية
INSERT INTO public.featured_pricing (duration_days, price, discount_percentage) VALUES
    (7, 500, 0),      -- 500 دج لأسبوع
    (14, 900, 10),    -- 900 دج لأسبوعين (خصم 10%)
    (30, 1500, 25);   -- 1500 دج لشهر (خصم 25%)

-- 3. جدول باقات الوكالات (Agency Subscriptions)
-- =====================================================
CREATE TABLE public.agency_packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    
    -- المميزات
    max_listings INTEGER, -- NULL = unlimited
    priority_display BOOLEAN DEFAULT false,
    analytics_access BOOLEAN DEFAULT false,
    dedicated_support BOOLEAN DEFAULT false,
    verified_badge BOOLEAN DEFAULT false,
    
    -- السعر الشهري
    monthly_price NUMERIC NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج الباقات الافتراضية
INSERT INTO public.agency_packages (name, name_ar, max_listings, priority_display, analytics_access, dedicated_support, verified_badge, monthly_price) VALUES
    ('basic', 'الباقة الأساسية', 10, false, false, false, false, 2000),
    ('professional', 'الباقة الاحترافية', 50, true, true, false, true, 5000),
    ('premium', 'الباقة المميزة', NULL, true, true, true, true, 10000);

-- 4. جدول اشتراكات الوكالات
-- =====================================================
CREATE TABLE public.agency_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    package_id UUID NOT NULL REFERENCES public.agency_packages(id),
    
    -- معلومات الوكالة
    agency_name TEXT NOT NULL,
    agency_phone TEXT,
    agency_address TEXT,
    agency_logo_url TEXT,
    commercial_register TEXT, -- السجل التجاري
    
    -- حالة الاشتراك
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'suspended')),
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    
    -- الدفع
    payment_method TEXT CHECK (payment_method IN ('wallet', 'ccp', 'baridimob')),
    last_payment_at TIMESTAMP WITH TIME ZONE,
    next_payment_at TIMESTAMP WITH TIME ZONE,
    
    -- التحقق
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. جدول خدمات التوثيق (Verification Services)
-- =====================================================
CREATE TABLE public.verification_services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    price NUMERIC NOT NULL,
    estimated_days INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج الخدمات الافتراضية
INSERT INTO public.verification_services (name, name_ar, description_ar, price, estimated_days) VALUES
    ('property_inspection', 'فحص العقار', 'زيارة ميدانية للعقار مع تقرير مفصل عن حالته', 3000, 5),
    ('document_verification', 'توثيق الأوراق', 'التحقق من صحة الوثائق العقارية (العقد، الملكية)', 2000, 3),
    ('legal_consultation', 'استشارة قانونية', 'استشارة مع محامي متخصص في العقارات', 5000, 2),
    ('full_report', 'التقرير الشامل', 'فحص + توثيق + استشارة قانونية (خصم 20%)', 8000, 7);

-- 6. جدول طلبات التوثيق
-- =====================================================
CREATE TABLE public.verification_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL,
    service_id UUID NOT NULL REFERENCES public.verification_services(id),
    
    -- معلومات الطلب
    notes TEXT,
    contact_phone TEXT,
    preferred_date DATE,
    
    -- الحالة
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded')),
    
    -- الدفع
    price_paid NUMERIC NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'ccp', 'baridimob')),
    payment_proof_url TEXT,
    payment_reference TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- التنفيذ
    assigned_to UUID, -- الموظف المكلف
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- التقرير النهائي
    report_url TEXT,
    report_summary TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. جدول سجل المدفوعات (Payment History)
-- =====================================================
CREATE TABLE public.payment_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    
    -- نوع الدفع
    payment_type TEXT NOT NULL CHECK (payment_type IN ('featured_listing', 'agency_subscription', 'verification_service', 'wallet_deposit')),
    reference_id UUID NOT NULL, -- ID من الجدول المعني
    
    -- المبلغ
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'DZD',
    
    -- طريقة الدفع
    payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'ccp', 'baridimob')),
    payment_proof_url TEXT,
    payment_reference TEXT,
    
    -- الحالة
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'refunded')),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- تفعيل RLS وإنشاء السياسات
-- =====================================================

ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- سياسات featured_listings
CREATE POLICY "Users can view active featured listings"
    ON public.featured_listings FOR SELECT
    USING (status = 'active' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own featured listings"
    ON public.featured_listings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending listings"
    ON public.featured_listings FOR UPDATE
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- سياسات التسعير (قراءة للجميع)
CREATE POLICY "Anyone can view pricing"
    ON public.featured_pricing FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage pricing"
    ON public.featured_pricing FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- سياسات باقات الوكالات (قراءة للجميع)
CREATE POLICY "Anyone can view packages"
    ON public.agency_packages FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage packages"
    ON public.agency_packages FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- سياسات اشتراكات الوكالات
CREATE POLICY "Users can view their own subscription"
    ON public.agency_subscriptions FOR SELECT
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own subscription"
    ON public.agency_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON public.agency_subscriptions FOR UPDATE
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- سياسات خدمات التوثيق (قراءة للجميع)
CREATE POLICY "Anyone can view verification services"
    ON public.verification_services FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage verification services"
    ON public.verification_services FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- سياسات طلبات التوثيق
CREATE POLICY "Users can view their own verification requests"
    ON public.verification_requests FOR SELECT
    USING (requester_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create verification requests"
    ON public.verification_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins can update verification requests"
    ON public.verification_requests FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

-- سياسات سجل المدفوعات
CREATE POLICY "Users can view their own payments"
    ON public.payment_history FOR SELECT
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own payments"
    ON public.payment_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update payments"
    ON public.payment_history FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- Triggers للتحديث التلقائي
-- =====================================================

CREATE TRIGGER update_featured_listings_updated_at
    BEFORE UPDATE ON public.featured_listings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_subscriptions_updated_at
    BEFORE UPDATE ON public.agency_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- دالة للتحقق من صلاحية الإعلان المميز
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_property_featured(property_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.featured_listings
        WHERE property_id = property_uuid
        AND status = 'active'
        AND expires_at > NOW()
    )
$$;

-- =====================================================
-- دالة للتحقق من اشتراك الوكالة
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_agency_subscription(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.agency_subscriptions
        WHERE user_id = user_uuid
        AND status = 'active'
        AND expires_at > NOW()
    )
$$;

-- =====================================================
-- دالة دفع لتمييز العقار من المحفظة
-- =====================================================

CREATE OR REPLACE FUNCTION public.pay_for_featured_listing(
    p_property_id UUID,
    p_duration_days INTEGER,
    p_feature_type TEXT DEFAULT 'top_results'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_price NUMERIC;
    v_wallet_id UUID;
    v_balance NUMERIC;
    v_listing_id UUID;
BEGIN
    -- الحصول على السعر
    SELECT price INTO v_price
    FROM public.featured_pricing
    WHERE duration_days = p_duration_days AND is_active = true;
    
    IF v_price IS NULL THEN
        RAISE EXCEPTION 'Invalid duration selected';
    END IF;
    
    -- الحصول على المحفظة والرصيد
    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = auth.uid();
    
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;
    
    IF v_balance < v_price THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_price, v_balance;
    END IF;
    
    -- خصم المبلغ من المحفظة
    UPDATE public.wallets
    SET balance = balance - v_price, updated_at = NOW()
    WHERE id = v_wallet_id;
    
    -- إنشاء الإعلان المميز
    INSERT INTO public.featured_listings (
        property_id, user_id, feature_type, duration_days, price_paid,
        status, starts_at, expires_at, payment_method, verified_at
    )
    VALUES (
        p_property_id, auth.uid(), p_feature_type, p_duration_days, v_price,
        'active', NOW(), NOW() + (p_duration_days || ' days')::INTERVAL, 'wallet', NOW()
    )
    RETURNING id INTO v_listing_id;
    
    -- تسجيل المعاملة في المحفظة
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference_id, reference_type, status)
    VALUES (v_wallet_id, 'payment', v_price, 'دفع مقابل تمييز العقار', v_listing_id, 'featured_listing', 'completed');
    
    -- تسجيل في سجل المدفوعات
    INSERT INTO public.payment_history (user_id, payment_type, reference_id, amount, payment_method, status, verified_at)
    VALUES (auth.uid(), 'featured_listing', v_listing_id, v_price, 'wallet', 'verified', NOW());
    
    RETURN v_listing_id;
END;
$$;