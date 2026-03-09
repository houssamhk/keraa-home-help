-- إصلاح مسار البحث للدوال
ALTER FUNCTION public.update_user_badges() SET search_path = public;
ALTER FUNCTION public.calculate_weighted_rating(UUID) SET search_path = public;