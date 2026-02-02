import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Star, 
  CheckCircle, 
  Clock, 
  XCircle,
  Loader2,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

interface HandymanAnalyticsProps {
  handymanId: string;
}

interface AnalyticsData {
  totalEarnings: number;
  completedJobs: number;
  pendingJobs: number;
  cancelledJobs: number;
  avgRating: number;
  totalReviews: number;
  earningsHistory: { date: string; amount: number }[];
}

export function HandymanAnalytics({ handymanId }: HandymanAnalyticsProps) {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (handymanId) {
      fetchAnalytics();
    }
  }, [handymanId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    try {
      // Fetch service requests
      const { data: requests } = await supabase
        .from('service_requests')
        .select('*')
        .eq('handyman_id', handymanId);

      // Fetch handyman profile for rating
      const { data: handyman } = await supabase
        .from('handymen')
        .select('rating, total_reviews')
        .eq('id', handymanId)
        .single();

      // Calculate stats
      const completed = requests?.filter(r => r.status === 'completed') || [];
      const pending = requests?.filter(r => ['pending', 'accepted', 'in_progress'].includes(r.status)) || [];
      const cancelled = requests?.filter(r => r.status === 'cancelled') || [];

      const totalEarnings = completed.reduce((sum, r) => sum + (r.final_price || r.estimated_price || 0), 0);

      // Generate earnings history (last 7 days)
      const earningsHistory: { date: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        const dayEarnings = completed
          .filter(r => {
            const completedDate = r.completed_at ? startOfDay(new Date(r.completed_at)) : null;
            return completedDate && completedDate.getTime() === date.getTime();
          })
          .reduce((sum, r) => sum + (r.final_price || r.estimated_price || 0), 0);
        
        earningsHistory.push({
          date: format(date, 'EEE', { locale: ar }),
          amount: dayEarnings
        });
      }

      setData({
        totalEarnings,
        completedJobs: completed.length,
        pendingJobs: pending.length,
        cancelledJobs: cancelled.length,
        avgRating: handyman?.rating || 0,
        totalReviews: handyman?.total_reviews || 0,
        earningsHistory
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        لا توجد بيانات متاحة
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {data.totalEarnings.toLocaleString('ar-DZ')}
              </p>
              <p className="text-xs text-muted-foreground">إجمالي الأرباح (دج)</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{data.completedJobs}</p>
              <p className="text-xs text-muted-foreground">مهام مكتملة</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{data.pendingJobs}</p>
              <p className="text-xs text-muted-foreground">طلبات نشطة</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{data.avgRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{data.totalReviews} تقييم</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Earnings Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">الأرباح - آخر 7 أيام</h3>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.earningsHistory}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value.toLocaleString('ar-DZ')} دج`, 'الأرباح']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
