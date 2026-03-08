import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Moon, Sun, Bell, Globe, LogOut, User, Shield, BellRing, Database, Trash2, Loader2, ShieldCheck, AlertCircle, Check, RefreshCw, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { seedDemoData, clearDemoData } from '@/utils/seedDemoData';
import { useLanguage, type Language } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

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

  // Support request state
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (user) fetchPendingRequests();
  }, [user]);

  const fetchPendingRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setPendingRequests(data);
  };

  const hasPendingRequest = (type: string) => 
    pendingRequests.some(r => r.request_type === type && r.status === 'pending');

  const handleSubmitRequest = async (type: 'role_change' | 'account_deletion') => {
    if (!user || !profile) return;
    setSubmitting(true);

    const { error } = await supabase.from('support_requests').insert({
      user_id: user.id,
      request_type: type,
      from_role: profile.role_type,
      to_role: type === 'role_change' ? selectedRole : null,
      reason: requestReason,
    });

    setSubmitting(false);
    if (error) {
      if (error.code === '23505') {
        toast({ title: t.settings.pendingRequest, description: t.settings.pendingRequestDesc, variant: 'destructive' });
      } else {
        toast({ title: t.error, description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: t.settings.requestSent, description: t.settings.requestSentDesc });
      setRoleChangeOpen(false);
      setDeleteAccountOpen(false);
      setRequestReason('');
      setSelectedRole('');
      fetchPendingRequests();
    }
  };

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
    if (profile?.role_type === 'handyman') return t.settings.handymanile?.role_type === 'owner') return t.settings.owner;
    if (profile?.role_type === 'provider') return t.settings.provider;
    return t.settings.tenant;
  };

  const roleOptions = [
    { value: 'tenant', label: t.settings.tenant },
    { value: 'owner', label: t.settings.owner },
    { value: 'handyman', label: t.settings.handyman || 'حرفي' r => r.value !== profile?.role_type);

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

        {/* Account Management */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.settings.accountManagement}</h3>
          
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setRoleChangeOpen(true)}
              disabled={hasPendingRequest('role_change')}
            >
              <RefreshCw className="w-5 h-5 text-primary" />
              <div className="text-right flex-1">
                <span className="block">{t.settings.changeRole}</span>
                <span className="text-xs text-muted-foreground">{t.settings.changeRoleDesc}</span>
              </div>
              {hasPendingRequest('role_change') && (
                <Badge variant="secondary" className="text-xs">{t.settings.pendingRequest}</Badge>
              )}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => setDeleteAccountOpen(true)}
              disabled={hasPendingRequest('account_deletion')}
            >
              <UserX className="w-5 h-5" />
              <div className="text-right flex-1">
                <span className="block">{t.settings.deleteAccount}</span>
                <span className="text-xs text-muted-foreground">{t.settings.deleteAccountDesc}</span>
              </div>
              {hasPendingRequest('account_deletion') && (
                <Badge variant="secondary" className="text-xs">{t.settings.pendingRequest}</Badge>
              )}
            </Button>
          </div>
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
          className="pb-8"
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

      {/* Role Change Dialog */}
      <Dialog open={roleChangeOpen} onOpenChange={setRoleChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.roleChangeRequest}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t.settings.selectNewRole}</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder={t.settings.selectNewRole} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t.settings.requestReason}</label>
              <Textarea
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder={t.settings.requestReason}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={!selectedRole || !requestReason || submitting}
              onClick={() => handleSubmitRequest('role_change')}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {t.settings.sendRequest}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t.settings.accountDeletionRequest}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.settings.deleteAccountDesc}</p>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t.settings.requestReason}</label>
              <Textarea
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder={t.settings.requestReason}
                rows={3}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={!requestReason || submitting}
              onClick={() => handleSubmitRequest('account_deletion')}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {t.settings.sendRequest}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
