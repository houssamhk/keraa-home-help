import { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Home, FileText, CreditCard, AlertTriangle, 
  TrendingUp, Activity, Loader2, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStatsData {
  totalUsers: number;
  totalProperties: number;
  totalContracts: number;
  totalPayments: number;
  pendingKyc: number;
  pendingReports: number;
  pendingSupport: number;
  activeContracts: number;
  revenueTotal: number;
  newUsersThisWeek: number;
  newPropertiesThisWeek: number;
  activeHandymen: number;
  securityThreats: number;
}

export function PlatformStats() {
  const [stats, setStats] = useState<PlatformStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    const [
      users, properties, contracts, payments,
      kyc, reports, support, handymen,
      threats, newUsers, newProperties
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('contracts').select('id, status', { count: 'exact' }),
      supabase.from('payment_history').select('id, status, amount', { count: 'exact' }),
      supabase.from('kyc_verifications').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('handymen').select('id', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from('threat_detection').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgoStr),
      supabase.from('properties').select('id', { count: 'exact', head: true }).gte('created_at', weekAgoStr),
    ]);

    const activeContracts = contracts.data?.filter(c => c.status === 'active' || c.status === 'signed').length || 0;
    const revenue = payments.data?.filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    setStats({
      totalUsers: users.count || 0,
      totalProperties: properties.count || 0,
      totalContracts: contracts.count || 0,
      totalPayments: payments.count || 0,
      pendingKyc: kyc.count || 0,
      pendingReports: reports.count || 0,
      pendingSupport: support.count || 0,
      activeContracts,
      revenueTotal: revenue,
      newUsersThisWeek: newUsers.count || 0,
      newPropertiesThisWeek: newProperties.count || 0,
      activeHandymen: handymen.count || 0,
      securityThreats: threats.count || 0,
    });

    // Fetch recent security events
    const { data: secEvents } = await supabase
      .from('security_audit_log')
      .select('action_type, created_at, is_suspicious, risk_score')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentActivity(secEvents || []);
    
    setLoading(false);
  };

  if (loading || !stats) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const actionItems = [
    { label: 'طلبات تحقق هوية', count: stats.pendingKyc, color: 'text-purple-400', urgent: stats.pendingKyc > 0 },
    { label: 'بلاغات معلقة', count: stats.pendingReports, color: 'text-destructive', urgent: stats.pendingReports > 0 },
    { label: 'طلبات دعم', count: stats.pendingSupport, color: 'text-yellow-400', urgent: stats.pendingSupport > 0 },
    { label: 'تهديدات أمنية', count: stats.securityThreats, color: 'text-red-500', urgent: stats.securityThreats > 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Action Required */}
      {actionItems.some(a => a.urgent) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              يتطلب اهتمامك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {actionItems.filter(a => a.urgent).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded text-sm">
                  <span>{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-xs text-blue-400">+{stats.newUsersThisWeek} هذا الأسبوع</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Home className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalProperties}</p>
                <p className="text-xs text-muted-foreground">إجمالي العقارات</p>
                <p className="text-xs text-green-400">+{stats.newPropertiesThisWeek} هذا الأسبوع</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalContracts}</p>
                <p className="text-xs text-muted-foreground">إجمالي العقود</p>
                <p className="text-xs text-purple-400">{stats.activeContracts} نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.revenueTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">إجمالي الإيرادات (دج)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            إحصائيات إضافية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
              <span className="text-muted-foreground">حرفيون نشطون</span>
              <span className="font-bold">{stats.activeHandymen}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
              <span className="text-muted-foreground">مدفوعات</span>
              <span className="font-bold">{stats.totalPayments}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              آخر الأحداث الأمنية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((event, i) => (
                <div key={i} className="flex items-center justify-between p-2 text-xs border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {event.is_suspicious && <AlertTriangle className="w-3 h-3 text-destructive" />}
                    <span>{event.action_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.risk_score > 30 && (
                      <Badge variant="destructive" className="text-xs px-1">خطر: {event.risk_score}</Badge>
                    )}
                    <span className="text-muted-foreground">
                      {new Date(event.created_at).toLocaleString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
