import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Moon, Sun, Bell, Globe, LogOut, User, Shield, BellRing, Database, Trash2, Loader2, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { seedDemoData, clearDemoData } from '@/utils/seedDemoData';
import { useLanguage, type Language } from '@/i18n/LanguageContext';

interface SettingsPageProps {
  onBack: () => void;
  onStartKYC?: () => void;
}

export function SettingsPage({ onBack, onStartKYC }: SettingsPageProps) {
  const { user, profile, updateSettings, signOut } = useAuth();
  const { toast } = useToast();
  const { t, language, setLanguage, dir } = useLanguage();
  const { isSupported, permission, requestPermission, isLoading: pushLoading, showNotification } = usePushNotifications();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isClearingDemo, setIsClearingDemo] = useState(false);
  const [localTheme, setLocalTheme] = useState<string>(
    () => profile?.settings?.theme || localStorage.getItem('sakani-theme') || 'dark'
  );

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const handleThemeChange = async (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setLocalTheme(newTheme);
    localStorage.setItem('sakani-theme', newTheme);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    await updateSettings({ theme: newTheme });
    toast({
      title: t.settings.themeChanged,
      description: isDark ? t.settings.darkTheme : t.settings.lightTheme
    });
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    await updateSettings({ notifications: enabled });
    toast({
      title: enabled ? t.settings.notificationsEnabled : t.settings.notificationsDisabled
    });
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    // Also persist in profile settings
    updateSettings({ language: lang });
    toast({ title: t.settings.languageChanged });
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: t.settings.signedOut,
      description: t.settings.seeYouSoon
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
        title: t.settings.demoDataAdded,
        description: `${result.createdItems?.properties} properties, ${result.createdItems?.handymen} handymen, ${result.createdItems?.appointments} appointments`
      });
    } else {
      toast({ title: t.error, description: result.message, variant: 'destructive' });
    }
  };

  const handleClearDemoData = async () => {
    if (!user) return;
    setIsClearingDemo(true);
    const result = await clearDemoData(user.id);
    setIsClearingDemo(false);
    
    if (result.success) {
      toast({ title: t.settings.dataDeleted, description: result.message });
    } else {
      toast({ title: t.error, description: result.message, variant: 'destructive' });
    }
  };

  const handleTestNotification = async () => {
    await showNotification('Sakani - Test', {
      body: 'Test notification',
      icon: '/favicon.ico',
      tag: 'test-notification'
    });
    toast({ title: t.settings.testNotificationSent, description: t.settings.checkNotifications });
  };

  const settings = profile?.settings || { theme: localTheme as 'dark' | 'light', language: 'ar', notifications: true };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'ar', label: t.settings.arabic, flag: '🇩🇿' },
    { code: 'fr', label: t.settings.french, flag: '🇫🇷' },
    { code: 'en', label: t.settings.english, flag: '🇬🇧' },
  ];

  const getRoleLabel = () => {
    if (profile?.role_type === 'tenant') return t.settings.tenant;
    if (profile?.role_type === 'provider') return t.settings.provider;
    return t.settings.owner;
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4"
      >
        <Button variant="glass" size="icon" onClick={onBack}>
          <BackArrow className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-2xl font-bold text-foreground">{t.settings.title}</h1>
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
              <h2 className="font-semibold text-foreground">{profile?.full_name || t.settings.user}</h2>
              <p className="text-sm text-muted-foreground">{getRoleLabel()}</p>
              {profile?.kyc_verified && (
                <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                  <Shield className="w-3 h-3" />
                  {t.settings.verified}
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
                <h3 className="font-medium text-foreground">{t.settings.kycTitle}</h3>
                <p className="text-xs text-muted-foreground">{t.settings.kycNotVerified}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{t.settings.kycDescription}</p>
            <Button variant="gold" className="w-full gap-2" onClick={onStartKYC}>
              <ShieldCheck className="w-5 h-5" />
              {t.settings.startVerification}
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
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.settings.appearance}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {localTheme === 'dark' ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <span className="text-foreground">{t.settings.darkMode}</span>
            </div>
            <Switch
              checked={localTheme === 'dark'}
              onCheckedChange={(checked) => handleThemeChange(checked)}
            />
          </div>
        </motion.div>

        {/* Language */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{t.settings.language}</h3>
          
          <div className="space-y-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  language === lang.code 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'bg-muted/50 border border-transparent hover:border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-foreground font-medium">{lang.label}</span>
                </div>
                {language === lang.code && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.settings.notifications}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <span className="text-foreground">{t.settings.appNotifications}</span>
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
                  <span className="text-foreground block">{t.settings.browserPush}</span>
                  <span className="text-xs text-muted-foreground">
                    {permission === 'granted' ? t.settings.pushEnabled : permission === 'denied' ? t.settings.pushDenied : t.settings.pushDisabled}
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
                  {pushLoading ? t.settings.enabling : t.settings.enable}
                </Button>
              )}
              {permission === 'granted' && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {t.settings.pushEnabled}
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Demo Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.settings.demoData}</h3>
          
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleSeedDemoData}
              disabled={isLoadingDemo}
            >
              {isLoadingDemo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5 text-primary" />}
              {t.settings.addDemoData}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={handleClearDemoData}
              disabled={isClearingDemo}
            >
              {isClearingDemo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              {t.settings.clearDemoData}
            </Button>

            {permission === 'granted' && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={handleTestNotification}
              >
                <BellRing className="w-5 h-5 text-primary" />
                {t.settings.testNotifications}
              </Button>
            )}
          </div>
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
            {t.settings.signOut}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
