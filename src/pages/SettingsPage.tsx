import { motion } from 'framer-motion';
import { ArrowRight, Moon, Sun, Bell, Globe, LogOut, User, Shield, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { profile, updateSettings, signOut } = useAuth();
  const { toast } = useToast();

  const handleThemeChange = async (isDark: boolean) => {
    await updateSettings({ theme: isDark ? 'dark' : 'light' });
    
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
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

  const settings = profile?.settings || { theme: 'dark', language: 'ar', notifications: true };

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
              <span className="text-foreground">الإشعارات</span>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={handleNotificationsChange}
            />
          </div>
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

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
