-- =====================================================
-- تحسين الأداء وفهرسة قاعدة البيانات
-- =====================================================

-- فهارس للبحث السريع في العقارات
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_available ON public.properties(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_created ON public.properties(created_at DESC);

-- فهارس للعقود
CREATE INDEX IF NOT EXISTS idx_contracts_landlord ON public.contracts(landlord_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_property ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON public.contracts(start_date, end_date);

-- فهارس للمراجعات والتقييمات
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON public.reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_contract ON public.reviews(contract_id);

-- فهارس للمحادثات والرسائل
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- فهارس للإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- فهارس للحرفيين
CREATE INDEX IF NOT EXISTS idx_handymen_location ON public.handymen(latitude, longitude) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_handymen_specialty ON public.handymen USING GIN(specialty);
CREATE INDEX IF NOT EXISTS idx_handymen_rating ON public.handymen(rating DESC);

-- فهارس المدفوعات والمحافظ
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);

-- فهارس الأمان
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_suspicious ON public.security_audit_log(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX IF NOT EXISTS idx_threat_detection_unresolved ON public.threat_detection(is_resolved) WHERE is_resolved = false;

-- فهارس الإعلانات المميزة
CREATE INDEX IF NOT EXISTS idx_featured_listings_active ON public.featured_listings(property_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_featured_listings_expires ON public.featured_listings(expires_at) WHERE status = 'active';

-- فهارس المواعيد
CREATE INDEX IF NOT EXISTS idx_appointments_owner ON public.appointments(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

-- =====================================================
-- نظام التقييمات المتقدم - جداول إضافية
-- =====================================================

-- جدول شارات التقييم المتقدمة
CREATE TABLE IF NOT EXISTS public.reputation_badges_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_id TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    icon TEXT DEFAULT 'star',
    color TEXT DEFAULT 'primary',
    min_reviews INTEGER DEFAULT 0,
    min_rating NUMERIC DEFAULT 0,
    category TEXT NOT NULL, -- 'owner', 'tenant', 'handyman', 'general'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- إدراج شارات افتراضية
INSERT INTO public.reputation_badges_config (badge_id, name_ar, name_en, description_ar, description_en, icon, color, category) VALUES
    ('reliable_owner', 'مالك موثوق', 'Reliable Owner', 'مالك يحظى بثقة المستأجرين', 'Owner trusted by tenants', 'shield', 'blue', 'owner'),
    ('responsive', 'سريع الاستجابة', 'Responsive', 'يرد بسرعة على الرسائل', 'Quick to respond to messages', 'clock', 'green', 'general'),
    ('fair_pricing', 'أسعار عادلة', 'Fair Pricing', 'يقدم أسعار معقولة', 'Offers reasonable prices', 'thumb-up', 'amber', 'owner'),
    ('well_maintained', 'عقار محافظ عليه', 'Well Maintained', 'يحافظ على جودة عقاراته', 'Maintains property quality', 'home', 'purple', 'owner'),
    ('clean_tenant', 'مستأجر نظيف', 'Clean Tenant', 'يحافظ على نظافة العقار', 'Keeps property clean', 'sparkles', 'cyan', 'tenant'),
    ('punctual_payment', 'دفع منتظم', 'Punctual Payment', 'يدفع في الموعد دائماً', 'Always pays on time', 'calendar', 'green', 'tenant'),
    ('respectful', 'محترم', 'Respectful', 'يتعامل باحترام مع الجميع', 'Treats everyone with respect', 'heart', 'red', 'general'),
    ('trustworthy', 'جدير بالثقة', 'Trustworthy', 'شخص موثوق به', 'A trustworthy person', 'verified', 'blue', 'general'),
    ('expert_handyman', 'حرفي خبير', 'Expert Handyman', 'خبرة عالية في مجاله', 'High expertise in their field', 'wrench', 'orange', 'handyman'),
    ('top_rated', 'الأعلى تقييماً', 'Top Rated', 'من أفضل المستخدمين تقييماً', 'Among top-rated users', 'star', 'gold', 'general')
ON CONFLICT (badge_id) DO NOTHING;

-- جدول تحليلات التقييمات
CREATE TABLE IF NOT EXISTS public.rating_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    total_reviews INTEGER DEFAULT 0,
    avg_rating NUMERIC DEFAULT 0,
    positive_reviews INTEGER DEFAULT 0,
    negative_reviews INTEGER DEFAULT 0,
    badges_earned TEXT[] DEFAULT '{}',
    computed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, period_type, period_start)
);

-- سياسات RLS
ALTER TABLE public.reputation_badges_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges config"
    ON public.reputation_badges_config FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage badges config"
    ON public.reputation_badges_config FOR ALL
    USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own analytics"
    ON public.rating_analytics FOR SELECT
    USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage analytics"
    ON public.rating_analytics FOR ALL
    TO service_role
    USING (true);

-- فهارس للجداول الجديدة
CREATE INDEX IF NOT EXISTS idx_rating_analytics_user ON public.rating_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_analytics_period ON public.rating_analytics(period_type, period_start);

-- =====================================================
-- جدول تحليلات الطلب (للخريطة الحرارية)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.demand_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    property_type TEXT,
    search_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    avg_price NUMERIC,
    period_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(city, property_type, period_date)
);

ALTER TABLE public.demand_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view demand analytics"
    ON public.demand_analytics FOR SELECT
    USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage demand analytics"
    ON public.demand_analytics FOR ALL
    TO service_role
    USING (true);

CREATE INDEX IF NOT EXISTS idx_demand_analytics_city ON public.demand_analytics(city);
CREATE INDEX IF NOT EXISTS idx_demand_analytics_date ON public.demand_analytics(period_date DESC);

-- =====================================================
-- دالة لحساب التقييم المرجح
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_weighted_rating(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    weighted_rating NUMERIC;
    total_weight NUMERIC;
BEGIN
    SELECT 
        COALESCE(
            SUM(r.rating * 
                CASE 
                    WHEN r.created_at > NOW() - INTERVAL '30 days' THEN 1.5
                    WHEN r.created_at > NOW() - INTERVAL '90 days' THEN 1.2
                    WHEN r.created_at > NOW() - INTERVAL '180 days' THEN 1.0
                    ELSE 0.8
                END
            ) / NULLIF(SUM(
                CASE 
                    WHEN r.created_at > NOW() - INTERVAL '30 days' THEN 1.5
                    WHEN r.created_at > NOW() - INTERVAL '90 days' THEN 1.2
                    WHEN r.created_at > NOW() - INTERVAL '180 days' THEN 1.0
                    ELSE 0.8
                END
            ), 0),
            0
        )
    INTO weighted_rating
    FROM public.reviews r
    WHERE r.reviewed_id = p_user_id;
    
    RETURN ROUND(weighted_rating, 2);
END;
$$;

-- =====================================================
-- دالة لتحديث شارات المستخدم تلقائياً
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_user_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_badges TEXT[];
    review_count INTEGER;
    avg_rating NUMERIC;
BEGIN
    -- حساب إحصائيات المستخدم
    SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO review_count, avg_rating
    FROM public.reviews
    WHERE reviewed_id = NEW.reviewed_id;
    
    -- جمع الشارات من المراجعات
    SELECT ARRAY_AGG(DISTINCT unnest)
    INTO user_badges
    FROM (
        SELECT UNNEST(badges) FROM public.reviews WHERE reviewed_id = NEW.reviewed_id AND badges IS NOT NULL
    ) AS all_badges;
    
    -- إضافة شارات تلقائية
    IF review_count >= 10 AND avg_rating >= 4.5 THEN
        user_badges := array_append(COALESCE(user_badges, '{}'), 'top_rated');
    END IF;
    
    -- تحديث الملف الشخصي
    UPDATE public.profiles
    SET 
        avg_rating = ROUND(avg_rating, 1),
        total_reviews = review_count,
        reputation_badges = COALESCE(user_badges, '{}'),
        updated_at = NOW()
    WHERE user_id = NEW.reviewed_id;
    
    RETURN NEW;
END;
$$;

-- إنشاء Trigger لتحديث الشارات
DROP TRIGGER IF EXISTS trigger_update_user_badges ON public.reviews;
CREATE TRIGGER trigger_update_user_badges
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_badges();