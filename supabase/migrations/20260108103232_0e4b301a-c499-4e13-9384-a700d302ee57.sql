-- =============================================
-- 1. إصلاح سياسة الإشعارات المتساهلة
-- =============================================
-- حذف السياسة القديمة المتساهلة
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- إنشاء سياسة جديدة أكثر أماناً - فقط service_role يمكنه إدراج الإشعارات
-- (يتم ذلك عبر edge functions التي تستخدم service_role)
CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- السماح للمستخدمين المصادق عليهم بإنشاء إشعارات لأنفسهم فقط
CREATE POLICY "Users can insert own notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 2. إنشاء جدول المفضلة
-- =============================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- تفعيل RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- سياسات المفضلة
CREATE POLICY "Users can view own favorites" 
ON public.favorites 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" 
ON public.favorites 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" 
ON public.favorites 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- 3. إنشاء جدول مشاهدات العقارات
-- =============================================
CREATE TABLE IF NOT EXISTS public.property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- السماح لأي شخص بتسجيل مشاهدة
CREATE POLICY "Anyone can log views" 
ON public.property_views 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

-- السماح لأصحاب العقارات بمشاهدة إحصائيات عقاراتهم
CREATE POLICY "Owners can view property stats" 
ON public.property_views 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p 
    WHERE p.id = property_views.property_id 
    AND p.owner_id = auth.uid()
  )
);

-- السماح للمسؤولين
CREATE POLICY "Admins can view all stats" 
ON public.property_views 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON public.property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_viewed_at ON public.property_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON public.favorites(property_id);

-- =============================================
-- 4. إنشاء جدول التقارير والشكاوى
-- =============================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('property', 'user', 'handyman', 'review')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- سياسات التقارير
CREATE POLICY "Users can create reports" 
ON public.reports 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" 
ON public.reports 
FOR SELECT 
TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all reports" 
ON public.reports 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- إضافة trigger لتحديث updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();