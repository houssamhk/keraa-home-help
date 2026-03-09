import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Eye, Loader2, Flag, User, Home, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reported_type: string;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function ReportsManagement() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportedDetails, setReportedDetails] = useState<any>(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  };

  const handleViewDetails = async (report: Report) => {
    setSelectedReport(report);
    setDetailDialog(true);
    setReportedDetails(null);

    if (report.reported_type === 'property') {
      const { data } = await supabase.from('properties').select('title, city, price, owner_id, is_available').eq('id', report.reported_id).maybeSingle();
      setReportedDetails(data);
    } else if (report.reported_type === 'handyman') {
      const { data } = await supabase.from('handymen').select('specialty, rating, user_id').eq('id', report.reported_id).maybeSingle();
      setReportedDetails(data);
    } else if (report.reported_type === 'user') {
      const { data } = await supabase.from('profiles').select('full_name, role_type, kyc_verified').eq('user_id', report.reported_id).maybeSingle();
      setReportedDetails(data);
    }
  };

  const handleAction = async (reportId: string, action: 'resolved' | 'dismissed', takeAction?: string) => {
    if (!user) return;
    setProcessing(reportId);

    const report = reports.find(r => r.id === reportId);

    // If resolving with action, perform the action
    if (action === 'resolved' && takeAction && report) {
      if (takeAction === 'hide_property') {
        await supabase.from('properties').update({ is_available: false }).eq('id', report.reported_id);
      } else if (takeAction === 'delete_property') {
        await supabase.from('properties').delete().eq('id', report.reported_id);
      } else if (takeAction === 'disable_handyman') {
        await supabase.from('handymen').update({ is_available: false }).eq('id', report.reported_id);
      }
    }

    const { error } = await supabase
      .from('reports')
      .update({
        status: action,
        admin_notes: adminNotes[reportId] || null,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (!error) {
      toast.success(action === 'resolved' ? 'تم معالجة البلاغ' : 'تم رفض البلاغ');
      
      // Notify reporter
      if (report) {
        await supabase.from('notifications').insert({
          user_id: report.reporter_id,
          title: action === 'resolved' ? 'تم معالجة بلاغك' : 'تم مراجعة بلاغك',
          message: action === 'resolved' 
            ? 'شكراً لك، تم اتخاذ الإجراء اللازم بشأن بلاغك'
            : 'تمت مراجعة بلاغك ولم يتم العثور على مخالفة',
          type: 'system',
        });
      }
      fetchReports();
    } else {
      toast.error('فشل في معالجة البلاغ');
    }
    setProcessing(null);
    setDetailDialog(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'property': return <Home className="w-4 h-4" />;
      case 'handyman': return <Wrench className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'property': return 'عقار';
      case 'handyman': return 'حرفي';
      case 'user': return 'مستخدم';
      default: return type;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'spam': return 'محتوى مزعج';
      case 'inappropriate': return 'محتوى غير لائق';
      case 'fraud': return 'احتيال';
      case 'fake': return 'معلومات مزيفة';
      case 'harassment': return 'مضايقة';
      case 'other': return 'أخرى';
      default: return reason;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const processedReports = reports.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{pendingReports.length}</p>
            <p className="text-xs text-muted-foreground">بلاغات معلقة</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{reports.filter(r => r.reported_type === 'property').length}</p>
            <p className="text-xs text-muted-foreground">بلاغات عقارات</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{reports.filter(r => r.reported_type === 'user' || r.reported_type === 'handyman').length}</p>
            <p className="text-xs text-muted-foreground">بلاغات مستخدمين</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            البلاغات المعلقة ({pendingReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingReports.length === 0 && (
            <p className="text-center text-muted-foreground py-8">لا توجد بلاغات معلقة 🎉</p>
          )}
          {pendingReports.map((report) => (
            <div key={report.id} className="p-4 bg-muted/50 rounded-lg space-y-3 border border-destructive/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(report.reported_type)}
                  <Badge variant="outline">{getTypeLabel(report.reported_type)}</Badge>
                  <Badge variant="destructive">{getReasonLabel(report.reason)}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString('ar-DZ')}
                </span>
              </div>

              {report.description && (
                <p className="text-sm text-foreground bg-background/50 p-2 rounded">{report.description}</p>
              )}

              <Textarea
                placeholder="ملاحظات الإدارة..."
                value={adminNotes[report.id] || ''}
                onChange={e => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                rows={2}
              />

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleViewDetails(report)}>
                  <Eye className="w-4 h-4 ml-1" />
                  عرض التفاصيل
                </Button>
                <Button size="sm" onClick={() => handleAction(report.id, 'resolved')} disabled={processing === report.id}>
                  {processing === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                  معالجة
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleAction(report.id, 'dismissed')} disabled={processing === report.id}>
                  <XCircle className="w-4 h-4 ml-1" />
                  رفض البلاغ
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Processed Reports */}
      {processedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">البلاغات المعالجة ({processedReports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedReports.slice(0, 20).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 text-sm border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(r.reported_type)}
                    <span>{getTypeLabel(r.reported_type)} - {getReasonLabel(r.reason)}</span>
                  </div>
                  <Badge variant={r.status === 'resolved' ? 'default' : 'secondary'}>
                    {r.status === 'resolved' ? 'تم الحل' : 'مرفوض'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-destructive" />
              تفاصيل البلاغ
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">النوع:</span>
                  <p className="font-medium">{getTypeLabel(selectedReport.reported_type)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">السبب:</span>
                  <p className="font-medium">{getReasonLabel(selectedReport.reason)}</p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <span className="text-sm text-muted-foreground">الوصف:</span>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{selectedReport.description}</p>
                </div>
              )}

              {reportedDetails && (
                <div className="bg-muted/30 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">تفاصيل العنصر المُبلّغ عنه:</h4>
                  {selectedReport.reported_type === 'property' && (
                    <div className="text-sm space-y-1">
                      <p>العنوان: {reportedDetails.title}</p>
                      <p>المدينة: {reportedDetails.city}</p>
                      <p>السعر: {reportedDetails.price?.toLocaleString()} دج</p>
                      <p>الحالة: {reportedDetails.is_available ? 'متاح' : 'مخفي'}</p>
                    </div>
                  )}
                  {selectedReport.reported_type === 'handyman' && (
                    <div className="text-sm space-y-1">
                      <p>التخصصات: {reportedDetails.specialty?.join(', ')}</p>
                      <p>التقييم: {reportedDetails.rating}/5</p>
                    </div>
                  )}
                  {selectedReport.reported_type === 'user' && (
                    <div className="text-sm space-y-1">
                      <p>الاسم: {reportedDetails.full_name || 'غير محدد'}</p>
                      <p>الدور: {reportedDetails.role_type}</p>
                      <p>التحقق: {reportedDetails.kyc_verified ? '✅' : '❌'}</p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex gap-2">
                {selectedReport.reported_type === 'property' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleAction(selectedReport.id, 'resolved', 'hide_property')}>
                      إخفاء العقار
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction(selectedReport.id, 'resolved', 'delete_property')}>
                      حذف العقار
                    </Button>
                  </>
                )}
                {selectedReport.reported_type === 'handyman' && (
                  <Button size="sm" variant="destructive" onClick={() => handleAction(selectedReport.id, 'resolved', 'disable_handyman')}>
                    تعطيل الحرفي
                  </Button>
                )}
                <Button size="sm" onClick={() => handleAction(selectedReport.id, 'resolved')}>
                  معالجة فقط
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
