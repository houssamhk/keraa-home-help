import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Moon, Sun, Bell, Globe, LogOut, User, Shield, ChevronLeft, BellRing, Database, Trash2, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { seedDemoData, clearDemoData } from '@/utils/seedDemoData';

interface SettingsPageProps {
  onBack: () => void;
  onStartKYC?: () => void;
}

export function SettingsPage({ onBack, onStartKYC }: SettingsPageProps) {
  const { user, profile, updateSettings, signOut } = useAuth();
  const { toast } = useToast();
  const { isSupported, permission, requestPermission, isLoading: pushLoading, showNotification } = usePushNotifications();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isClearingDemo, setIsClearingDemo] = useState(false);

  const handleThemeChange = async (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    
    // Apply immediately to DOM and localStorage
    localStorage.setItem('sakani-theme', newTheme);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Persist to profile
    await updateSettings({ theme: newTheme });
    
    toast({
      title: 'تم تغيير المظهر',
      description: isDark ? 'الوضع الداكن' : 'الوضع الفاتح'
    });
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    await updateSettings({ notifications: enabled });
    toast({
      title: enabled ? 'تم تفعيل الإشعارات' : 'تم إيقاف الإشعارات'
    });
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'تم تسجيل الخروج',
      description: 'نراك قريباً!'
    });
    onBack();
  };

  const handleSeedDemoData = async () => {
    if (!user) return;
    setIsLoadingDemo(true);
    const result = await seedDemoData(user.id);
    setIsLoadingDemo(false);
    
    if (result.success) {
      toast({
        title: 'تم إضافة البيانات التجريبية',
        description: `${result.createdItems?.properties} عقارات، ${result.createdItems?.handymen} حرفيين، ${result.createdItems?.appointments} مواعيد`
      });
    } else {
      toast({
        title: 'خطأ',
        description: result.message,
        variant: 'destructive'
      });
    }
  };

  const handleClearDemoData = async () => {
    if (!user) return;
    setIsClearingDemo(true);
    const result = await clearDemoData(user.id);
    setIsClearingDemo(false);
    
    if (result.success) {
      toast({
        title: 'تم حذف البيانات',
        description: result.message
      });
    } else {
      toast({
        title: 'خطأ',
        description: result.message,
        variant: 'destructive'
      });
    }
  };

  const handleTestNotification = async () => {
    await showNotification('سكني - إشعار تجريبي', {
      body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات بشكل صحيح',
      icon: '/favicon.ico',
      tag: 'test-notification'
    });
    toast({
      title: 'تم إرسال إشعار تجريبي',
      description: 'تحقق من الإشعارات'
    });
  };

  const currentTheme = profile?.settings?.theme || localStorage.getItem('sakani-theme') || 'dark';
  const settings = profile?.settings || { theme: currentTheme as 'dark' | 'light', language: 'ar', notifications: true };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4"
      >
        <Button variant="glass" size="icon" onClick={onBack}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-2xl font-bold text-foreground">الإعدادات</h1>
      </motion.header>

      {/* Settings List */}
      <div className="px-6 space-y-4">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{profile?.full_name || 'المستخدم'}</h2>
              <p className="text-sm text-muted-foreground">
                {profile?.role_type === 'tenant' ? 'مستأجر' : 
                 profile?.role_type === 'provider' ? 'مقدم خدمة' : 'مالك'}
              </p>
              {profile?.kyc_verified && (
                <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                  <Shield className="w-3 h-3" />
                  تم التحقق
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* KYC Verification Section */}
        {!profile?.kyc_verified && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-4 border border-yellow-500/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">التحقق من الهوية</h3>
                <p className="text-xs text-muted-foreground">لم يتم التحقق من هويتك بعد</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              بعض الميزات غير متاحة بدون التحقق من الهوية مثل إنشاء العقود والمحادثات.
            </p>
            <Button 
              variant="gold" 
              className="w-full gap-2"
              onClick={onStartKYC}
            >
              <ShieldCheck className="w-5 h-5" />
              بدء التحقق الآن
            </Button>
          </motion.div>
        )}

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">المظهر</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <span className="text-foreground">الوضع الداكن</span>
            </div>
            <Switch
              checked={settings.theme === 'dark'}
              onCheckedChange={(checked) => handleThemeChange(checked)}
            />
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">الإشعارات</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <span className="text-foreground">إشعارات التطبيق</span>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={handleNotificationsChange}
            />
          </div>

          {isSupported && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-foreground block">إشعارات المتصفح (Push)</span>
                  <span className="text-xs text-muted-foreground">
                    {permission === 'granted' ? 'مفعّلة' : permission === 'denied' ? 'مرفوضة' : 'غير مفعّلة'}
                  </span>
                </div>
              </div>
              {permission !== 'granted' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={requestPermission}
                  disabled={pushLoading || permission === 'denied'}
                >
                  {pushLoading ? 'جاري...' : 'تفعيل'}
                </Button>
              )}
              {permission === 'granted' && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  مفعّلة
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Language */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">اللغة</h3>
          
          <button className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <span className="text-foreground">العربية</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Demo Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">بيانات تجريبية</h3>
          
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleSeedDemoData}
              disabled={isLoadingDemo}
            >
              {isLoadingDemo ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Database className="w-5 h-5 text-primary" />
              )}
              إضافة بيانات تجريبية
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={handleClearDemoData}
              disabled={isClearingDemo}
            >
              {isClearingDemo ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              حذف البيانات التجريبية
            </Button>

            {permission === 'granted' && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={handleTestNotification}
              >
                <BellRing className="w-5 h-5 text-primary" />
                اختبار الإشعارات
              </Button>
            )}
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
