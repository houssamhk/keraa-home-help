import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Brain,
  Sparkles,
  Target,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  metric?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
    change: string;
  };
}

interface PerformanceScore {
  overall: number;
  engagement: number;
  conversion: number;
  satisfaction: number;
}

export function SmartInsights() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [performanceScore, setPerformanceScore] = useState<PerformanceScore>({
    overall: 0,
    engagement: 0,
    conversion: 0,
    satisfaction: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      generateInsights();
    }
  }, [user]);

  const generateInsights = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const generatedInsights: Insight[] = [];
      let engagementScore = 50;
      let conversionScore = 50;
      let satisfactionScore = 50;

      // Fetch user's data
      const [
        { data: properties },
        { data: contracts },
        { data: appointments },
        { data: reviews },
        { count: viewsCount },
        { data: wallet },
      ] = await Promise.all([
        supabase.from('properties').select('*').eq('owner_id', user.id),
        supabase.from('contracts').select('*').or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`),
        supabase.from('appointments').select('*').or(`owner_id.eq.${user.id},tenant_id.eq.${user.id}`),
        supabase.from('reviews').select('*').eq('reviewed_id', user.id),
        supabase.from('property_views').select('*', { count: 'exact', head: true }),
        supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      // For owners: Property insights
      if (profile?.role_type === 'owner' && properties?.length) {
        const availableCount = properties.filter(p => p.is_available).length;
        const rentedCount = properties.length - availableCount;
        
        if (availableCount > 0 && viewsCount && viewsCount > 10) {
          engagementScore += 20;
          generatedInsights.push({
            id: 'high-views',
            type: 'success',
            title: language === 'ar' ? 'نشاط مرتفع!' : 'High Activity!',
            description: language === 'ar' 
              ? `عقاراتك تحصل على ${viewsCount} مشاهدة. استمر في الترويج!`
              : `Your properties got ${viewsCount} views. Keep promoting!`,
            metric: {
              value: viewsCount.toString(),
              trend: 'up',
              change: '+15%'
            }
          });
        }

        if (availableCount > 2) {
          generatedInsights.push({
            id: 'vacant-properties',
            type: 'warning',
            title: language === 'ar' ? 'عقارات شاغرة' : 'Vacant Properties',
            description: language === 'ar'
              ? `لديك ${availableCount} عقارات شاغرة. فكر في تخفيض السعر أو تمييزها.`
              : `You have ${availableCount} vacant properties. Consider reducing price or featuring them.`,
            action: {
              label: language === 'ar' ? 'تمييز عقار' : 'Feature Property',
              href: '/properties'
            }
          });
        }

        if (rentedCount > 0) {
          conversionScore += 25;
        }
      }

      // Contract insights
      if (contracts?.length) {
        const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'signed');
        const expiringContracts = contracts.filter(c => {
          if (!c.end_date) return false;
          const endDate = new Date(c.end_date);
          const now = new Date();
          const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilEnd > 0 && daysUntilEnd <= 30;
        });

        if (expiringContracts.length > 0) {
          generatedInsights.push({
            id: 'expiring-contracts',
            type: 'warning',
            title: language === 'ar' ? 'عقود قريبة الانتهاء' : 'Expiring Contracts',
            description: language === 'ar'
              ? `لديك ${expiringContracts.length} عقد ينتهي خلال 30 يوم. تواصل مع الطرف الآخر.`
              : `${expiringContracts.length} contract(s) expiring in 30 days. Contact the other party.`,
            action: {
              label: language === 'ar' ? 'عرض العقود' : 'View Contracts',
              href: '/contracts'
            }
          });
        }

        if (activeContracts.length > 0) {
          conversionScore += 15;
        }
      }

      // Appointment insights
      if (appointments?.length) {
        const pendingAppointments = appointments.filter(a => a.status === 'pending');
        const upcomingAppointments = appointments.filter(a => {
          const aptDate = new Date(a.appointment_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return aptDate >= today && a.status === 'confirmed';
        });

        if (pendingAppointments.length > 0) {
          generatedInsights.push({
            id: 'pending-appointments',
            type: 'info',
            title: language === 'ar' ? 'مواعيد معلقة' : 'Pending Appointments',
            description: language === 'ar'
              ? `لديك ${pendingAppointments.length} موعد بانتظار التأكيد.`
              : `You have ${pendingAppointments.length} appointment(s) awaiting confirmation.`,
            action: {
              label: language === 'ar' ? 'إدارة المواعيد' : 'Manage Appointments',
              href: '/appointments'
            }
          });
        }

        if (upcomingAppointments.length > 0) {
          engagementScore += 10;
        }
      }

      // Review insights
      if (reviews?.length) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        satisfactionScore = Math.min(100, avgRating * 20);

        if (avgRating >= 4.5) {
          generatedInsights.push({
            id: 'excellent-rating',
            type: 'success',
            title: language === 'ar' ? 'تقييم ممتاز!' : 'Excellent Rating!',
            description: language === 'ar'
              ? `تقييمك ${avgRating.toFixed(1)}/5 من ${reviews.length} تقييم. ممتاز!`
              : `Your rating is ${avgRating.toFixed(1)}/5 from ${reviews.length} reviews. Excellent!`,
            metric: {
              value: avgRating.toFixed(1),
              trend: 'up',
              change: '+0.2'
            }
          });
        } else if (avgRating < 3.5) {
          generatedInsights.push({
            id: 'improve-rating',
            type: 'warning',
            title: language === 'ar' ? 'حسّن تقييمك' : 'Improve Your Rating',
            description: language === 'ar'
              ? `تقييمك ${avgRating.toFixed(1)}/5. اعمل على تحسين الخدمة للحصول على تقييمات أفضل.`
              : `Your rating is ${avgRating.toFixed(1)}/5. Work on improving service quality.`,
          });
        }
      }

      // Wallet insights
      if (wallet) {
        if (wallet.balance > 10000) {
          generatedInsights.push({
            id: 'high-balance',
            type: 'opportunity',
            title: language === 'ar' ? 'رصيد جيد!' : 'Good Balance!',
            description: language === 'ar'
              ? `لديك ${wallet.balance.toLocaleString()} دج. يمكنك تمييز عقاراتك أو الاشتراك في باقة الوكالات.`
              : `You have ${wallet.balance.toLocaleString()} DZD. Consider featuring properties or agency subscription.`,
            action: {
              label: language === 'ar' ? 'استخدم رصيدك' : 'Use Balance',
              href: '/wallet'
            }
          });
        }

        if (wallet.pending_balance > 0) {
          generatedInsights.push({
            id: 'pending-balance',
            type: 'info',
            title: language === 'ar' ? 'رصيد محجوز' : 'Pending Balance',
            description: language === 'ar'
              ? `لديك ${wallet.pending_balance.toLocaleString()} دج محجوز كعربون.`
              : `You have ${wallet.pending_balance.toLocaleString()} DZD held as deposit.`,
          });
        }
      }

      // KYC insight
      if (!profile?.kyc_verified) {
        generatedInsights.push({
          id: 'kyc-required',
          type: 'warning',
          title: language === 'ar' ? 'أكمل التحقق' : 'Complete Verification',
          description: language === 'ar'
            ? 'وثّق حسابك للوصول إلى جميع المميزات وزيادة ثقة المستخدمين.'
            : 'Verify your account to access all features and increase user trust.',
          action: {
            label: language === 'ar' ? 'التحقق الآن' : 'Verify Now',
            href: '/profile'
          }
        });
      } else {
        conversionScore += 20;
      }

      // Calculate overall score
      const overallScore = Math.round((engagementScore + conversionScore + satisfactionScore) / 3);

      setPerformanceScore({
        overall: Math.min(100, overallScore),
        engagement: Math.min(100, engagementScore),
        conversion: Math.min(100, conversionScore),
        satisfaction: Math.min(100, satisfactionScore),
      });

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case 'opportunity':
        return <Target className="h-5 w-5 text-purple-500" />;
    }
  };

  const getInsightBadgeVariant = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'destructive';
      case 'info':
        return 'secondary';
      case 'opportunity':
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Performance Score Card */}
      <Card className="glass-card border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'مؤشر الأداء الذكي' : 'Smart Performance Index'}
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="hsl(var(--muted))"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="hsl(var(--primary))"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(performanceScore.overall / 100) * 220} 220`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{performanceScore.overall}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'التفاعل' : 'Engagement'}
                </span>
                <span>{performanceScore.engagement}%</span>
              </div>
              <Progress value={performanceScore.engagement} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'التحويل' : 'Conversion'}
                </span>
                <span>{performanceScore.conversion}%</span>
              </div>
              <Progress value={performanceScore.conversion} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'الرضا' : 'Satisfaction'}
                </span>
                <span>{performanceScore.satisfaction}%</span>
              </div>
              <Progress value={performanceScore.satisfaction} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          {language === 'ar' ? 'رؤى ذكية' : 'Smart Insights'}
        </h3>
        
        {insights.length === 0 ? (
          <Card className="glass-card border-border/50 p-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'كل شيء على ما يرام! لا توجد توصيات حالياً.' : 'All good! No recommendations at this time.'}
            </p>
          </Card>
        ) : (
          insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        {insight.metric && (
                          <Badge variant="outline" className="gap-1">
                            {insight.metric.trend === 'up' ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            {insight.metric.change}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                      {insight.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-8 px-2 text-primary"
                          onClick={() => window.location.href = insight.action!.href}
                        >
                          {insight.action.label}
                          <ArrowRight className="h-3 w-3 ms-1" />
                        </Button>
                      )}
                    </div>
                    {insight.metric && (
                      <div className="text-right">
                        <span className="text-2xl font-bold">{insight.metric.value}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
