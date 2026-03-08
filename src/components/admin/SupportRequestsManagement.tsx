import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, UserX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SupportRequest {
  id: string;
  user_id: string;
  request_type: string;
  from_role: string | null;
  to_role: string | null;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export function SupportRequestsManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  const handleAction = async (request: SupportRequest, action: 'approved' | 'rejected') => {
    if (!user) return;
    setProcessing(request.id);

    // If approving a role change, update the profile role
    if (action === 'approved' && request.request_type === 'role_change' && request.to_role) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role_type: request.to_role })
        .eq('user_id', request.user_id);
      
      if (profileError) {
        toast.error('فشل في تغيير نوع الحساب: ' + profileError.message);
        setProcessing(null);
        return;
      }
    }

    const { error } = await supabase
      .from('support_requests')
      .update({
        status: action,
        admin_notes: adminNotes[request.id] || null,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    if (!error) {
      toast.success(action === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب');
      
      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: action === 'approved' ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك',
        message: request.request_type === 'role_change'
          ? (action === 'approved' 
              ? `تم تغيير نوع حسابك إلى ${request.to_role}` 
              : `تم رفض طلب تغيير نوع الحساب${adminNotes[request.id] ? ': ' + adminNotes[request.id] : ''}`)
          : (action === 'approved'
              ? 'سيتم حذف حسابك قريباً'
              : `تم رفض طلب حذف الحساب${adminNotes[request.id] ? ': ' + adminNotes[request.id] : ''}`),
        type: 'system',
      });

      fetchRequests();
    } else {
      toast.error('فشل في معالجة الطلب');
    }
    setProcessing(null);
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'owner': return 'مالك';
      case 'tenant': return 'مستأجر';
      case 'provider': return 'حرفي';
      case 'handyman': return 'حرفي';
      default: return role || '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          طلبات الدعم ({pendingRequests.length} معلق)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا توجد طلبات معلقة</p>
        )}

        {pendingRequests.map((req) => (
          <div key={req.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {req.request_type === 'role_change' ? (
                  <RefreshCw className="w-5 h-5 text-primary" />
                ) : (
                  <UserX className="w-5 h-5 text-destructive" />
                )}
                <span className="font-medium">
                  {req.request_type === 'role_change' ? 'تغيير نوع الحساب' : 'حذف الحساب'}
                </span>
              </div>
              <Badge variant="secondary">معلق</Badge>
            </div>

            {req.request_type === 'role_change' && (
              <p className="text-sm text-foreground">
                من <Badge variant="outline">{getRoleLabel(req.from_role)}</Badge>
                {' → '}
                <Badge variant="default">{getRoleLabel(req.to_role)}</Badge>
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              <span className="font-medium">السبب:</span> {req.reason || '-'}
            </p>

            <p className="text-xs text-muted-foreground">
              {new Date(req.created_at).toLocaleDateString('ar-DZ')} - ID: {req.user_id.slice(0, 8)}
            </p>

            <Textarea
              placeholder="ملاحظات الإدارة (اختياري)"
              value={adminNotes[req.id] || ''}
              onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
              rows={2}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={processing === req.id}
                onClick={() => handleAction(req, 'approved')}
              >
                {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                موافقة
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={processing === req.id}
                onClick={() => handleAction(req, 'rejected')}
              >
                <XCircle className="w-4 h-4 ml-1" />
                رفض
              </Button>
            </div>
          </div>
        ))}

        {processedRequests.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">الطلبات المعالجة</h4>
            {processedRequests.slice(0, 10).map((req) => (
              <div key={req.id} className="flex items-center justify-between p-2 text-sm">
                <span>{req.request_type === 'role_change' ? 'تغيير حساب' : 'حذف حساب'}</span>
                <Badge variant={req.status === 'approved' ? 'default' : 'destructive'}>
                  {req.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
