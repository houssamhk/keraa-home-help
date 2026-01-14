import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Home, 
  FileText, 
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsData {
  viewsOverTime: { date: string; views: number }[];
  appointmentsByStatus: { status: string; count: number; fill: string }[];
  contractsByStatus: { status: string; count: number; fill: string }[];
  propertyTypeDistribution: { type: string; count: number; fill: string }[];
  monthlyRevenue: { month: string; revenue: number }[];
  stats: {
    totalViews: number;
    viewsChange: number;
    totalAppointments: number;
    appointmentsChange: number;
    activeContracts: number;
    contractsChange: number;
    monthlyIncome: number;
    incomeChange: number;
  };
}

const statusColors: Record<string, string> = {
  pending: 'hsl(45, 93%, 47%)',
  confirmed: 'hsl(142, 76%, 36%)',
  cancelled: 'hsl(0, 84%, 60%)',
  completed: 'hsl(221, 83%, 53%)',
  active: 'hsl(142, 76%, 36%)',
  signed: 'hsl(221, 83%, 53%)',
  expired: 'hsl(0, 84%, 60%)',
};

const propertyTypeColors: Record<string, string> = {
  apartment: 'hsl(221, 83%, 53%)',
  house: 'hsl(142, 76%, 36%)',
  villa: 'hsl(45, 93%, 47%)',
  studio: 'hsl(280, 67%, 50%)',
  office: 'hsl(340, 75%, 55%)',
};

const chartConfig = {
  views: { label: 'المشاهدات', color: 'hsl(221, 83%, 53%)' },
  revenue: { label: 'الإيرادات', color: 'hsl(142, 76%, 36%)' },
  appointments: { label: 'المواعيد', color: 'hsl(45, 93%, 47%)' },
  contracts: { label: 'العقود', color: 'hsl(280, 67%, 50%)' },
};

export function OwnerAnalytics() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    viewsOverTime: [],
    appointmentsByStatus: [],
    contractsByStatus: [],
    propertyTypeDistribution: [],
    monthlyRevenue: [],
    stats: {
      totalViews: 0,
      viewsChange: 0,
      totalAppointments: 0,
      appointmentsChange: 0,
      activeContracts: 0,
      contractsChange: 0,
      monthlyIncome: 0,
      incomeChange: 0,
    },
  });

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch properties for this owner
      const { data: properties } = await supabase
        .from('properties')
        .select('id, property_type, price')
        .eq('owner_id', user.id);

      const propertyIds = properties?.map(p => p.id) || [];

      // Fetch property views over the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: views } = await supabase
        .from('property_views')
        .select('viewed_at, property_id')
        .in('property_id', propertyIds.length > 0 ? propertyIds : ['none'])
        .gte('viewed_at', sevenDaysAgo.toISOString());

      // Process views by day
      const viewsByDay: Record<string, number> = {};
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        viewsByDay[dayName] = 0;
      }

      views?.forEach(view => {
        const date = new Date(view.viewed_at);
        const dayName = days[date.getDay()];
        if (viewsByDay[dayName] !== undefined) {
          viewsByDay[dayName]++;
        }
      });

      const viewsOverTime = Object.entries(viewsByDay).map(([date, views]) => ({
        date,
        views,
      }));

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('status, created_at')
        .eq('owner_id', user.id);

      // Process appointments by status
      const appointmentCounts: Record<string, number> = {};
      appointments?.forEach(apt => {
        appointmentCounts[apt.status] = (appointmentCounts[apt.status] || 0) + 1;
      });

      const appointmentsByStatus = Object.entries(appointmentCounts).map(([status, count]) => ({
        status: getStatusLabel(status),
        count,
        fill: statusColors[status] || 'hsl(var(--primary))',
      }));

      // Fetch contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select('status, monthly_amount, created_at')
        .eq('landlord_id', user.id);

      // Process contracts by status
      const contractCounts: Record<string, number> = {};
      contracts?.forEach(contract => {
        contractCounts[contract.status] = (contractCounts[contract.status] || 0) + 1;
      });

      const contractsByStatus = Object.entries(contractCounts).map(([status, count]) => ({
        status: getStatusLabel(status),
        count,
        fill: statusColors[status] || 'hsl(var(--primary))',
      }));

      // Property type distribution
      const typeCounts: Record<string, number> = {};
      properties?.forEach(prop => {
        const type = prop.property_type || 'apartment';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const propertyTypeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
        type: getPropertyTypeLabel(type),
        count,
        fill: propertyTypeColors[type] || 'hsl(var(--primary))',
      }));

      // Monthly revenue from active contracts
      const monthlyIncome = contracts
        ?.filter(c => c.status === 'active' || c.status === 'signed')
        .reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;

      // Generate monthly revenue data (simulated based on contracts)
      const monthlyRevenue = generateMonthlyRevenue(contracts || []);

      // Calculate stats
      const activeContracts = contracts?.filter(c => 
        c.status === 'active' || c.status === 'signed'
      ).length || 0;

      setData({
        viewsOverTime,
        appointmentsByStatus,
        contractsByStatus,
        propertyTypeDistribution,
        monthlyRevenue,
        stats: {
          totalViews: views?.length || 0,
          viewsChange: 12, // Placeholder
          totalAppointments: appointments?.length || 0,
          appointmentsChange: 5,
          activeContracts,
          contractsChange: 2,
          monthlyIncome,
          incomeChange: 8,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      cancelled: 'ملغي',
      completed: 'مكتمل',
      active: 'نشط',
      signed: 'موقع',
      expired: 'منتهي',
    };
    return labels[status] || status;
  };

  const getPropertyTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      apartment: 'شقة',
      house: 'منزل',
      villa: 'فيلا',
      studio: 'ستوديو',
      office: 'مكتب',
    };
    return labels[type] || type;
  };

  const generateMonthlyRevenue = (contracts: any[]): { month: string; revenue: number }[] => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    const baseRevenue = contracts
      .filter(c => c.status === 'active' || c.status === 'signed')
      .reduce((sum, c) => sum + (c.monthly_amount || 0), 0);

    return months.map((month, index) => ({
      month,
      revenue: Math.floor(baseRevenue * (0.8 + Math.random() * 0.4)),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المشاهدات"
          value={data.stats.totalViews}
          change={data.stats.viewsChange}
          icon={Eye}
          color="blue"
        />
        <StatCard
          title="المواعيد"
          value={data.stats.totalAppointments}
          change={data.stats.appointmentsChange}
          icon={Calendar}
          color="amber"
        />
        <StatCard
          title="العقود النشطة"
          value={data.stats.activeContracts}
          change={data.stats.contractsChange}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="الدخل الشهري"
          value={`${data.stats.monthlyIncome.toLocaleString('ar-DZ')} دج`}
          change={data.stats.incomeChange}
          icon={DollarSign}
          color="purple"
          isAmount
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="views" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
          <TabsTrigger value="views">المشاهدات</TabsTrigger>
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          <TabsTrigger value="contracts">العقود</TabsTrigger>
          <TabsTrigger value="properties">العقارات</TabsTrigger>
        </TabsList>

        <TabsContent value="views" className="mt-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">المشاهدات خلال الأسبوع</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <AreaChart data={data.viewsOverTime}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(221, 83%, 53%)"
                    fill="url(#viewsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">المواعيد حسب الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              {data.appointmentsByStatus.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={data.appointmentsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {data.appointmentsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <p>لا توجد مواعيد بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">العقود حسب الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              {data.contractsByStatus.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={data.contractsByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="status" type="category" className="text-xs" width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {data.contractsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <p>لا توجد عقود بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="mt-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">توزيع أنواع العقارات</CardTitle>
            </CardHeader>
            <CardContent>
              {data.propertyTypeDistribution.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={data.propertyTypeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      nameKey="type"
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {data.propertyTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <p>لا توجد عقارات بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Monthly Revenue Chart */}
      {data.monthlyRevenue.some(m => m.revenue > 0) && (
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">الإيرادات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={data.monthlyRevenue}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="revenue" 
                  fill="url(#revenueGradient)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  change: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'amber' | 'purple';
  isAmount?: boolean;
}

function StatCard({ title, value, change, icon: Icon, color, isAmount }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-500',
    green: 'bg-green-500/20 text-green-500',
    amber: 'bg-amber-500/20 text-amber-500',
    purple: 'bg-purple-500/20 text-purple-500',
  };

  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <p className={`font-bold text-foreground ${isAmount ? 'text-lg' : 'text-2xl'}`}>
        {typeof value === 'number' ? value.toLocaleString('ar-DZ') : value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </motion.div>
  );
}
