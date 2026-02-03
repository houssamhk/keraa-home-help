import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Building2, 
  BarChart3, 
  Home, 
  Eye, 
  Users,
  TrendingUp,
  Calendar,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AgencyBadge } from '@/components/premium/AgencyBadge';

interface AgencySubscription {
  id: string;
  agency_name: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  package: {
    name: string;
    name_ar: string;
    max_listings: number | null;
    monthly_price: number;
    priority_display: boolean;
    analytics_access: boolean;
    verified_badge: boolean;
  };
}

interface AgencyDashboardProps {
  onBack: () => void;
}

export function AgencyDashboard({ onBack }: AgencyDashboardProps) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<AgencySubscription | null>(null);
  const [stats, setStats] = useState({
    totalListings: 0,
    totalViews: 0,
    totalInquiries: 0,
    conversionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchStats();
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('agency_subscriptions')
      .select(`
        *,
        package:agency_packages(*)
      `)
      .eq('user_id', user.id)
      .single();
    
    if (!error && data) {
      setSubscription(data as unknown as AgencySubscription);
    }
    setIsLoading(false);
  };

  const fetchStats = async () => {
    if (!user) return;
    
    // Get property count
    const { count: listingsCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    
    // Get views count
    const { data: viewsData } = await supabase
      .from('property_views')
      .select('id, property_id, properties!inner(owner_id)')
      .eq('properties.owner_id', user.id);
    
    // Get inquiries count
    const { count: inquiriesCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    setStats({
      totalListings: listingsCount || 0,
      totalViews: viewsData?.length || 0,
      totalInquiries: inquiriesCount || 0,
      conversionRate: viewsData?.length 
        ? Math.round(((inquiriesCount || 0) / viewsData.length) * 100) 
        : 0
    });
  };

  const getDaysRemaining = () => {
    if (!subscription?.expires_at) return 0;
    const expires = new Date(subscription.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!subscription || subscription.status !== 'active') {
    return (
      <div className="min-h-screen bg-background safe-area-inset">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pt-6 pb-4 flex items-center gap-4"
        >
          <Button variant="glass" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">لوحة الوكالة</h1>
        </motion.header>

        <div className="px-6 py-20 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">لا يوجد اشتراك نشط</h2>
          <p className="text-muted-foreground mb-6">
            {subscription?.status === 'pending' 
              ? 'اشتراكك قيد المراجعة، سيتم تفعيله قريباً'
              : 'اشترك في إحدى باقات الوكالات للوصول إلى هذه الميزات'}
          </p>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="glass" size="icon" onClick={onBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">{subscription.agency_name}</h1>
              <AgencyBadge packageName={subscription.package.name as 'basic' | 'professional' | 'premium'} size="sm" />
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الاشتراك</p>
              <p className="font-medium">{subscription.package.name_ar}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm text-muted-foreground">متبقي</p>
            <p className={`font-bold ${daysRemaining <= 7 ? 'text-destructive' : 'text-primary'}`}>
              {daysRemaining} يوم
            </p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-6 pb-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>التحليلات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalListings}</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.package.max_listings 
                        ? `من ${subscription.package.max_listings}`
                        : 'غير محدود'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalViews}</p>
                    <p className="text-xs text-muted-foreground">مشاهدة</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalInquiries}</p>
                    <p className="text-xs text-muted-foreground">استفسار</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.conversionRate}%</p>
                    <p className="text-xs text-muted-foreground">معدل التحويل</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Features */}
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-3">مميزات باقتك</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span>عدد العقارات</span>
                  <span className="font-medium">
                    {subscription.package.max_listings || 'غير محدود'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span>أولوية الظهور</span>
                  <span className={subscription.package.priority_display ? 'text-green-500' : 'text-muted-foreground'}>
                    {subscription.package.priority_display ? 'نعم' : 'لا'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span>التحليلات المتقدمة</span>
                  <span className={subscription.package.analytics_access ? 'text-green-500' : 'text-muted-foreground'}>
                    {subscription.package.analytics_access ? 'نعم' : 'لا'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>علامة التوثيق</span>
                  <span className={subscription.package.verified_badge ? 'text-green-500' : 'text-muted-foreground'}>
                    {subscription.package.verified_badge ? 'نعم' : 'لا'}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            {subscription.package.analytics_access ? (
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <h3 className="font-semibold mb-4">أداء الأسبوع الماضي</h3>
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    رسم بياني للأداء
                  </div>
                </div>
                
                <div className="glass-card p-4">
                  <h3 className="font-semibold mb-4">أكثر العقارات مشاهدة</h3>
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات كافية بعد
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">التحليلات المتقدمة</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  قم بالترقية إلى الباقة الاحترافية أو المميزة للوصول إلى التحليلات المتقدمة
                </p>
                <Button variant="gold">ترقية الباقة</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
