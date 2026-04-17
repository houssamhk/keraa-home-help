import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Plus, 
  Home, 
  Eye, 
  Edit, 
  Trash2, 
  MessageSquare,
  TrendingUp,
  Star,
  BarChart3,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePropertyViews } from '@/hooks/usePropertyViews';
import { OwnerAnalytics } from '@/components/dashboard/OwnerAnalytics';
import { SmartInsights } from '@/components/dashboard/SmartInsights';
import { FeaturedListingDialog } from '@/components/premium/FeaturedListingDialog';
import { AgencySubscriptionDialog } from '@/components/premium/AgencySubscriptionDialog';
import { FeaturedBadge } from '@/components/premium/FeaturedBadge';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  price_period: string;
  property_type: string;
  is_available: boolean;
  created_at: string;
  is_featured?: boolean;
}

interface OwnerDashboardProps {
  onBack: () => void;
  onAddProperty: () => void;
  onEditProperty: (id: string) => void;
}

export function OwnerDashboard({ onBack, onAddProperty, onEditProperty }: OwnerDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getOwnerStats } = usePropertyViews();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    availableProperties: 0,
    totalViews: 0,
    totalInquiries: 0
  });

  useEffect(() => {
    if (user) {
      fetchProperties();
      fetchRealStats();
    }
  }, [user]);

  const fetchRealStats = async () => {
    if (!user) return;
    
    // Get real view stats
    const viewStats = await getOwnerStats(user.id);
    
    // Get real inquiry count from conversations
    const { count: inquiryCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    setStats(prev => ({
      ...prev,
      totalViews: viewStats.totalViews,
      totalInquiries: inquiryCount || 0
    }));
  };

  const fetchProperties = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Fetch featured listings for this user
    const { data: featuredData } = await supabase
      .from('featured_listings')
      .select('property_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());
    
    const featuredIds = new Set(featuredData?.map(f => f.property_id) || []);
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const propertiesWithFeatured = data.map(p => ({
        ...p,
        is_featured: featuredIds.has(p.id)
      }));
      setProperties(propertiesWithFeatured);
      setStats(prev => ({
        ...prev,
        totalProperties: data.length,
        availableProperties: data.filter(p => p.is_available).length
      }));
    }
    setIsLoading(false);
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setProperties(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف العقار بنجاح'
      });
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('properties')
      .update({ is_available: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setProperties(prev => prev.map(p => 
        p.id === id ? { ...p, is_available: !currentStatus } : p
      ));
    }
  };

  const formatPrice = (price: number, period: string) => {
    const periodText: Record<string, string> = {
      day: 'يوم',
      week: 'أسبوع',
      month: 'شهر',
      year: 'سنة'
    };
    return `${price.toLocaleString('ar-DZ')} دج/${periodText[period] || 'شهر'}`;
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="glass" size="icon" onClick={onBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="font-serif text-2xl font-bold text-foreground">لوحة التحكم</h1>
          </div>
          <Button variant="gold" size="sm" onClick={onAddProperty} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>إضافة عقار</span>
          </Button>
        </div>
        
        {/* Agency Subscription Button */}
        <div className="px-6 mb-4">
          <AgencySubscriptionDialog 
            trigger={
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Building2 className="w-4 h-4" />
                <span>اشتراك الوكالات - باقات احترافية</span>
              </Button>
            }
            onSuccess={fetchProperties}
          />
        </div>
      </motion.header>

      {/* Tabs for Dashboard Sections */}
      <div className="px-6 pb-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/50 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">التحليلات</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">العقارات</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalProperties}</p>
                    <p className="text-xs text-muted-foreground">عقاراتي</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.availableProperties}</p>
                    <p className="text-xs text-muted-foreground">متاحة</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalViews}</p>
                    <p className="text-xs text-muted-foreground">مشاهدة</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalInquiries}</p>
                    <p className="text-xs text-muted-foreground">استفسار</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Properties List */}
            <h2 className="text-lg font-semibold text-foreground mb-4">أحدث العقارات</h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : properties.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-8 text-center"
              >
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">لا توجد عقارات بعد</p>
                <p className="text-sm text-muted-foreground mb-4">أضف أول عقار لك الآن</p>
                <Button variant="gold" onClick={onAddProperty} className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span>إضافة عقار</span>
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {properties.slice(0, 3).map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{property.title}</h3>
                        <p className="text-sm text-muted-foreground">{property.city}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        property.is_available 
                          ? 'bg-primary/15 text-primary' 
                          : 'bg-destructive/15 text-destructive'
                      }`}>
                        {property.is_available ? 'متاح' : 'غير متاح'}
                      </span>
                    </div>
                    <span className="text-primary font-medium text-sm">
                      {formatPrice(property.price, property.price_period)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <SmartInsights />
            <OwnerAnalytics />
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <h2 className="text-lg font-semibold text-foreground mb-4">جميع العقارات</h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : properties.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-8 text-center"
              >
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">لا توجد عقارات بعد</p>
                <p className="text-sm text-muted-foreground mb-4">أضف أول عقار لك الآن</p>
                <Button variant="gold" onClick={onAddProperty} className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span>إضافة عقار</span>
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {properties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{property.title}</h3>
                          {property.is_featured && <FeaturedBadge size="sm" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{property.address}، {property.city}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        property.is_available 
                          ? 'bg-primary/15 text-primary' 
                          : 'bg-destructive/15 text-destructive'
                      }`}>
                        {property.is_available ? 'متاح' : 'غير متاح'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-medium">
                        {formatPrice(property.price, property.price_period)}
                      </span>
                      <div className="flex gap-2">
                        {/* Featured Listing Button */}
                        {!property.is_featured && (
                          <FeaturedListingDialog
                            propertyId={property.id}
                            propertyTitle={property.title}
                            trigger={
                              <Button variant="gold" size="icon" title="تمييز الإعلان">
                                <Star className="w-4 h-4" />
                              </Button>
                            }
                            onSuccess={fetchProperties}
                          />
                        )}
                        <Button 
                          variant="glass" 
                          size="icon"
                          onClick={() => toggleAvailability(property.id, property.is_available)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="glass" 
                          size="icon"
                          onClick={() => onEditProperty(property.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="glass" 
                          size="icon"
                          onClick={() => deleteProperty(property.id)}
                          className="hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
