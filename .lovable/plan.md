
# خطة بناء الأنظمة الناقصة والمتكاملة

## نظرة عامة على المشروع

بعد مراجعة شاملة للكود، سأقوم ببناء 5 أنظمة رئيسية ناقصة أو غير مكتملة:

---

## 1. نظام حجز خدمات الحرفيين المتكامل

### الوضع الحالي
- يوجد `BookHandymanDialog` لحجز موعد فقط
- لا يوجد نظام متكامل لإدارة طلبات الخدمة

### التغييرات المطلوبة

#### قاعدة البيانات
```text
إنشاء جدول جديد: service_requests
├── id (uuid, primary key)
├── handyman_id (uuid, references handymen)
├── client_id (uuid, references auth.users)
├── service_type (text)
├── description (text)
├── preferred_date (date)
├── preferred_time (time)
├── address (text)
├── latitude/longitude (numeric)
├── status: pending → accepted → in_progress → completed → cancelled
├── estimated_price (numeric)
├── final_price (numeric)
├── started_at, completed_at (timestamp)
├── client_rating, handyman_rating (integer)
├── created_at, updated_at
```

#### الملفات الجديدة
- `src/components/handymen/ServiceRequestDialog.tsx` - نموذج طلب خدمة مفصل
- `src/components/handymen/ServiceRequestCard.tsx` - بطاقة عرض الطلب
- `src/pages/ServiceRequestsPage.tsx` - صفحة إدارة الطلبات

#### التعديلات
- `HandymanDashboard.tsx` - إضافة قسم الطلبات الواردة
- `HandymanDetailPage.tsx` - تحديث زر الحجز

---

## 2. نظام الإشعارات الفورية المتكامل

### الوضع الحالي
- يوجد `usePushNotifications` hook أساسي
- يوجد `NotificationCenter` للإشعارات داخل التطبيق
- لا يوجد ربط حقيقي مع Push API

### التغييرات المطلوبة

#### قاعدة البيانات
```text
إنشاء جدول جديد: push_subscriptions
├── id (uuid)
├── user_id (uuid)
├── endpoint (text)
├── p256dh_key (text)
├── auth_key (text)
├── device_info (jsonb)
├── created_at
```

#### Edge Function جديدة
```text
supabase/functions/send-push-notification/index.ts
├── يستقبل user_id و notification data
├── يجلب subscription من الجدول
├── يرسل عبر Web Push API
```

#### الملفات الجديدة
- `src/hooks/usePushSubscription.ts` - إدارة الاشتراك
- `src/components/notifications/NotificationSettings.tsx` - إعدادات الإشعارات

#### التعديلات
- `usePushNotifications.ts` - ربط مع Supabase
- `sw.js` - تحسين Service Worker
- `SettingsPage.tsx` - إضافة إعدادات الإشعارات

---

## 3. لوحة تحكم الحرفيين المحسنة

### الوضع الحالي
- `HandymanDashboard` يعرض بيانات ثابتة (0 مهام، 0 طلبات)
- لا يوجد تتبع للإيرادات الفعلية

### التغييرات المطلوبة

#### الملفات الجديدة
- `src/components/dashboard/HandymanAnalytics.tsx` - تحليلات الحرفي
- `src/components/dashboard/HandymanRequestsList.tsx` - قائمة الطلبات
- `src/components/dashboard/HandymanEarnings.tsx` - تتبع الأرباح

#### التعديلات على `HandymanDashboard.tsx`
```text
├── جلب الطلبات الفعلية من service_requests
├── حساب الإيرادات من العقود المكتملة
├── عرض رسوم بيانية للأداء
├── إضافة tabs: نظرة عامة | الطلبات | الأرباح | التقييمات
```

---

## 4. نظام المحفظة الرقمية

### الوضع الحالي
- يوجد نظام العربون (Arrabon) للضمانات
- لا توجد محفظة رقمية متكاملة

### التغييرات المطلوبة

#### قاعدة البيانات
```text
إنشاء جدول: wallets
├── id (uuid)
├── user_id (uuid, unique)
├── balance (numeric, default 0)
├── pending_balance (numeric, default 0)
├── created_at, updated_at

إنشاء جدول: wallet_transactions
├── id (uuid)
├── wallet_id (uuid)
├── type: deposit | withdrawal | escrow_hold | escrow_release | payment | refund
├── amount (numeric)
├── description (text)
├── reference_id (uuid) - للربط مع contracts/arrabons
├── status: pending | completed | failed | cancelled
├── created_at
```

#### الملفات الجديدة
- `src/pages/WalletPage.tsx` - صفحة المحفظة الرئيسية
- `src/components/wallet/WalletBalance.tsx` - عرض الرصيد
- `src/components/wallet/TransactionsList.tsx` - سجل المعاملات
- `src/components/wallet/DepositForm.tsx` - نموذج الإيداع
- `src/components/wallet/WithdrawForm.tsx` - نموذج السحب

#### التعديلات
- `App.tsx` - إضافة مسار `/wallet`
- `AIVoiceHub.tsx` - إضافة زر المحفظة
- `ArrabonPage.tsx` - ربط مع المحفظة

---

## 5. خريطة الطلب الحرارية للأدمن

### الوضع الحالي
- يوجد `AdminDashboard` مع tabs أساسية
- لا توجد خريطة حرارية للمناطق

### التغييرات المطلوبة

#### الملفات الجديدة
- `src/components/admin/DemandHeatmap.tsx` - خريطة حرارية
- `src/components/admin/AreaStatistics.tsx` - إحصائيات المناطق

#### التعديلات على `AdminDashboard.tsx`
```text
├── إضافة tab "خريطة الطلب"
├── تجميع بيانات properties حسب الموقع
├── تجميع بيانات handymen حسب الموقع
├── عرض المناطق الأكثر طلباً
```

---

## التنفيذ التقني

### المرحلة 1: قاعدة البيانات
1. إنشاء جدول `service_requests` مع RLS
2. إنشاء جدول `push_subscriptions` مع RLS
3. إنشاء جدولي `wallets` و `wallet_transactions` مع RLS
4. إضافة triggers لتحديث المحفظة تلقائياً

### المرحلة 2: Edge Functions
1. إنشاء `send-push-notification` function
2. تحديث edge functions الحالية لإرسال الإشعارات

### المرحلة 3: الواجهات
1. بناء نظام طلبات الخدمة
2. تحسين لوحة الحرفيين
3. بناء صفحة المحفظة
4. إضافة الخريطة الحرارية

### المرحلة 4: الربط والتكامل
1. ربط الإشعارات مع جميع الأحداث
2. ربط المحفظة مع العقود والعربون
3. اختبار التدفق الكامل

---

## ملخص الملفات

### ملفات جديدة (12 ملف)
```text
src/pages/
├── ServiceRequestsPage.tsx
├── WalletPage.tsx

src/components/handymen/
├── ServiceRequestDialog.tsx
├── ServiceRequestCard.tsx

src/components/wallet/
├── WalletBalance.tsx
├── TransactionsList.tsx
├── DepositForm.tsx
├── WithdrawForm.tsx

src/components/admin/
├── DemandHeatmap.tsx
├── AreaStatistics.tsx

src/components/dashboard/
├── HandymanAnalytics.tsx
├── HandymanEarnings.tsx

src/hooks/
├── usePushSubscription.ts

supabase/functions/
├── send-push-notification/index.ts
```

### ملفات معدلة (8 ملفات)
```text
├── src/App.tsx
├── src/pages/HandymanDashboard.tsx
├── src/pages/AdminDashboard.tsx
├── src/pages/SettingsPage.tsx
├── src/components/home/AIVoiceHub.tsx
├── src/hooks/usePushNotifications.ts
├── public/sw.js
├── src/components/handymen/BookHandymanDialog.tsx
```

### جداول قاعدة البيانات الجديدة
```text
├── service_requests
├── push_subscriptions
├── wallets
├── wallet_transactions
```

---

## الجدول الزمني المتوقع

هذا مشروع كبير يتطلب تنفيذاً متسلسلاً. سأبدأ بالأساسيات (قاعدة البيانات) ثم أبني الواجهات تدريجياً.

هل توافق على هذه الخطة للبدء في التنفيذ؟
